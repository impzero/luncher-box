import {
  ConnectedSocket,
  MessageBody,
  OnConnect,
  OnMessage,
  SocketController,
  SocketIO,
  EmitOnSuccess,
  EmitOnFail,
  SocketId
} from 'socket-controllers';
import { redisClient } from '../config';

@SocketController()
export class OrderController {
  @OnMessage('fetch_orders')
  async connection(@SocketIO() io: SocketIO.Socket) {
    const key = 'orders';
    const ordersJSON = await redisClient.get(key);

    let orders = [];

    if (ordersJSON) {
      orders = JSON.parse(ordersJSON);
    }

    /**
     * Emit all of the orders to the client
     */
    io.emit('fetched_orders', orders);
  }

  @OnMessage('place_order')
  async place(
    @SocketIO() io: SocketIO.Socket,
    @SocketId() socketId: string,
    @MessageBody() order: any
  ) {
    /**
     * Attach state of the order
     */
    order.state = 0;

    const key = 'orders';
    const ordersJSON = await redisClient.get(key);

    let orders = [];

    if (ordersJSON) {
      orders = JSON.parse(ordersJSON);

      /**
       * Attach id to order
       */
      const id = orders[orders.length - 1].id + 1;
      order.id = id;

      /**
       * Attach sender id to order
       */
      order.senderId = socketId;

      orders.push(order);
    } else {
      /**
       * Attach id to order
       */
      const id = 0;
      order.id = id;

      /**
       * Attach sender id to order
       */
      order.senderId = socketId;

      orders = [order];
    }

    /**
     * Save orders in redis server
     */
    await redisClient.set(key, JSON.stringify(orders));

    /**
     * Emit the new orders back to the client
     */
    io.emit('placed_order', orders);
  }

  @OnMessage('accept_order')
  async accept(@SocketIO() io: SocketIO.Socket, @MessageBody() orderId: number) {
    const key = 'orders';
    const ordersJSON = await redisClient.get(key);

    let orders = [];
    let order = {};

    if (ordersJSON) {
      orders = JSON.parse(ordersJSON);

      const orderIndex = orders.findIndex((orderItem: any) => orderItem.id === orderId);

      if (orderIndex >= 0) {
        orders[orderIndex].state = 1;
        order = orders[orderIndex];
      }
    }

    await redisClient.set(key, JSON.stringify(orders));
    // @ts-ignore
    io.to(order.senderId).emit('accepted_order', order);
  }

  @OnMessage('decline_order')
  async decline(@SocketIO() io: SocketIO.Socket, @MessageBody() orderId: number) {
    const key = 'orders';
    const ordersJSON = await redisClient.get(key);

    let orders = [];
    let order = {};

    if (ordersJSON) {
      orders = JSON.parse(ordersJSON);

      const orderIndex = orders.findIndex((orderItem: any) => orderItem.id === orderId);

      if (orderIndex >= 0) {
        order = orders[orderIndex];

        // @ts-ignore
        order.state = 3;
        orders.splice(orderIndex, 1);
      }

      if (orders.length - 1 > 0) {
        await redisClient.set(key, JSON.stringify(orders));
      } else {
        await redisClient.del(key);
      }
    }

    // @ts-ignore
    io.to(order.senderId).emit('declined_order', order);
  }

  @OnMessage('finish_order')
  async finish(@SocketIO() io: SocketIO.Socket, @MessageBody() orderId: number) {
    const key = 'orders';
    const ordersJSON = await redisClient.get(key);

    let orders = [];
    let order = {};

    if (ordersJSON) {
      orders = JSON.parse(ordersJSON);

      const orderIndex = orders.findIndex((orderItem: any) => orderItem.id === orderId);

      if (orderIndex >= 0) {
        orders[orderIndex].state = 2;
        order = orders[orderIndex];
      }
    }

    await redisClient.set(key, JSON.stringify(orders));

    // @ts-ignore
    io.to(order.senderId).emit('finished_order', order);
  }
}
