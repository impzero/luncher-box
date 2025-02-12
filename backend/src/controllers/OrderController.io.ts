/* istanbul ignore file */
import { TransformValidationOptions } from 'class-transformer-validator';
import { Authorized, Delete, Get, JsonController, Param, Put } from 'routing-controllers';
import { MessageBody, OnMessage, SocketController, SocketId } from 'socket-controllers';
import { getRepository, In, Repository } from 'typeorm';
import { io } from '../config';
import {
  Order,
  OrderNotFoundError,
  OrderNotValidError,
  OrderProduct,
  Product,
  Table
} from '../entities';
import { QueryResponse, TransformAndValidateTuple } from '../types';
import { transformAndValidate } from '../utils';

@SocketController()
@JsonController('/orders')
export class OrderController {
  private productRepository: Repository<Product>;
  private tableRepository: Repository<Table>;
  private orderRepository: Repository<Order>;
  private transformAndValidateOrder: (
    obj: object | Array<{}>,
    options?: TransformValidationOptions
  ) => TransformAndValidateTuple<Order>;

  /**
   * Load the Product repository
   */
  constructor() {
    this.productRepository = getRepository(Product);
    this.tableRepository = getRepository(Table);
    this.orderRepository = getRepository(Order);
    this.transformAndValidateOrder = transformAndValidate(Order);
  }

  @OnMessage('socket-connect')
  connect(@MessageBody() message: string) {
    io.emit('socket-connected', message);
  }

  /**
   * GET /orders
   *
   * Gets all orders
   */
  @Get()
  @Authorized()
  async getAll() {
    return await this.orderRepository.find({
      relations: ['products', 'products.product', 'table'],
      order: {
        placed: 'DESC'
      }
    });
  }

  /**
   * DELETE /orders
   *
   * Deletes all orders
   */
  @Delete()
  @Authorized('Admin')
  async deleteAll() {
    const orders = await this.orderRepository.find({
      relations: ['products', 'products.product', 'table'],
      order: {
        placed: 'DESC'
      }
    });

    /**
     * Set isTaken to false on all of the tables that have orders placed
     */
    await Promise.all(
      orders.map(({ table }) => this.tableRepository.save({ ...table, isTaken: false }))
    );

    return await this.orderRepository.delete(orders.map(o => o.id));
  }

  /**
   * PUT /orders/accept/:orderId
   *
   * Accepts an order based on the query params
   * @param orderId
   */
  @Put('/accept/:orderId')
  @Authorized('Waiter')
  async accept(@Param('orderId') orderId: string) {
    const order = await this.orderRepository.findOne(orderId, {
      relations: ['products', 'products.product', 'table']
    });

    if (order) {
      order.state = 1;
      order.accepted = new Date();

      const { products, table, ...orderWithoutRelations } = order;

      await this.orderRepository.save(orderWithoutRelations);
    } else {
      throw new OrderNotFoundError();
    }

    io.to(order.customerId).emit('accepted-order', order);
    io.emit('accepted-order-admin', order);

    return order;
  }

  /**
   * PUT /orders/decline/:orderId
   *
   * Declines an order based on the query params
   * @param orderId
   */
  @Put('/decline/:orderId')
  @Authorized('Waiter')
  async decline(@Param('orderId') orderId: string) {
    const order = await this.orderRepository.findOne(orderId, {
      relations: ['products', 'products.product', 'table']
    });

    if (order) {
      order.state = 3;
      order.declined = new Date();

      const { products, table, ...orderWithoutRelations } = order;
      await this.orderRepository.save(orderWithoutRelations);

      const orders = await this.orderRepository.find({
        where: {
          table: {
            id: order.table.id
          }
        }
      });

      if (orders.every(o => o.state > 1)) {
        await this.tableRepository.save({
          ...order.table,
          isTaken: false
        });
      }
    } else {
      throw new OrderNotFoundError();
    }

    io
      // @ts-ignore
      .to(order.customerId)
      .emit('declined-order', order);
    io.emit('declined-order-admin', order);

    return order;
  }

  /**
   * PUT /orders/finish/:orderId
   *
   * Finishes an order based on the query params
   * @param orderId
   */
  @Put('/finish/:orderId')
  @Authorized('Cook')
  async finish(@Param('orderId') orderId: string) {
    const order = await this.orderRepository.findOne(orderId, {
      relations: ['products', 'products.product', 'table']
    });

    if (order) {
      order.state = 2;
      order.finished = new Date();

      const { products, table, ...orderWithoutRelations } = order;
      await this.orderRepository.save(orderWithoutRelations);

      const orders = await this.orderRepository.find({
        where: {
          table: {
            id: order.table.id
          }
        }
      });

      if (orders.every(o => o.state > 1)) {
        await this.tableRepository.save({
          ...order.table,
          isTaken: false
        });
      }
    } else {
      throw new OrderNotFoundError();
    }

    io.to(order.customerId).emit('finished-order', order);
    io.emit('finished-order-admin', order);

    return order;
  }

  /**
   * Socket Emit place-order
   *
   * Places an order based on the socket's message body
   * @param socketId
   * @param order
   */
  @OnMessage('place-order')
  async place(@SocketId() socketId: string, @MessageBody() orderJSON: Order) {
    let [order, orderErr] = await this.transformAndValidateOrder(orderJSON);
    let syncedProducts: QueryResponse<Product[]> = [];
    let table: QueryResponse<Table>;

    if (!order.products) {
      orderErr.push('products not found');
    } else {
      /**
       * Sync products from frontend with products from database
       */
      syncedProducts = await this.productRepository.find({
        where: {
          // @ts-ignore
          id: In(order.products.map(({ id }: Product) => id))
        }
      });

      if (!syncedProducts.length) {
        orderErr.push('products not found');
      }
    }

    if (!order.table) {
      orderErr.push('table not found');
    } else {
      /**
       * Make sure the table exists
       */
      table = await this.tableRepository.findOne({
        where: {
          name: order.table.name
        }
      });

      if (!table) {
        orderErr.push('table not found');
      } else {
        table.isTaken = true;
        order.table = table;
      }
    }

    if (orderErr.length) {
      io.to(socketId).emit('placed-order-fail', new OrderNotValidError(orderErr));
      return;
    }

    const orderProducts: OrderProduct[] = [];

    /**
     * Attach quantity to synced products
     */
    for (const syncedProduct of syncedProducts) {
      for (const orderProduct of order.products) {
        // @ts-ignore
        if (syncedProduct.id === orderProduct.id) {
          const op = new OrderProduct();

          op.order = order;
          op.product = syncedProduct;
          op.quantity = orderProduct.quantity;

          orderProducts.push(op);
        }
      }
    }

    order.customerId = socketId;
    order.state = 0;
    order.placed = new Date();
    order.products = orderProducts;

    order = await this.orderRepository.save(order);

    /**
     * Update the status of the table (isTaken was set to true a few lines above)
     */
    await this.tableRepository.save(table!);

    /**
     * Remove circular references
     */
    // @ts-ignore
    order.products = order.products.map(({ order: o, ...op }) => op);

    io.emit('placed-order-admin', order);
    io.to(order.customerId).emit('placed-order', order);
  }

  /**
   * Socket Emit update-customer-id
   *
   * Updates the customer id based on the new orders
   * @param orderIds
   */
  @OnMessage('update-customerId')
  async updateCustomerId(@SocketId() customerId: string, @MessageBody() orderIds: string[]) {
    const orders = await this.orderRepository.find({
      where: {
        id: In(orderIds)
      },
      relations: ['products', 'products.product', 'table'],
      order: {
        placed: 'DESC'
      }
    });

    await this.orderRepository.save(
      orders.map(({ products, table, ...o }) => ({ ...o, customerId }))
    );

    io.to(customerId).emit('updated-customerId', orders);
  }
}
