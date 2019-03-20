import localForage from 'localforage';
import React, { Component } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { CustomerContext } from '../context';
import { Order, Product } from '../interfaces';

interface Props {
  children: React.ReactNode;
}

interface State {
  order: Order;
  table: string;
  totalAmount: number;
  orderHisotry: Order[];
}

const socket = io(`${SOCKET_URL}`);

class CustomerContextProvider extends Component<Props, State> {
  state: State = {
    order: {
      products: [],
      comment: '',
      table: ''
    },
    table: '',
    totalAmount: 0,
    orderHisotry: []
  };

  syncWithLocalForage = async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      const currentOrder: Order = (await localForage.getItem(
        'currentOrder'
      )) || {
        products: [],
        comment: '',
        table: ''
      };

      const totalAmount: number =
        (await localForage.getItem('totalAmount')) || 0;
      const table: string = (await localForage.getItem('table')) || '';

      currentOrder.table = table;

      this.setState({ order: currentOrder, totalAmount, table }, () =>
        resolve()
      );
    });
  };

  clear = async () => {
    this.setState({
      order: {
        id: 1,
        products: [],
        comment: '',
        table: ''
      },
      table: '',
      totalAmount: 0
    });

    return Promise.all([
      localForage.removeItem('currentOrder'),
      localForage.removeItem('totalAmount')
    ]);
  };

  increment = async (product: Product) => {
    this.setState(
      prevState => {
        let isNewProduct = true;

        const editedProducts: Product[] = [];
        prevState.order.products.forEach(p => {
          if (p.id === product.id) {
            isNewProduct = false;

            editedProducts.push({
              ...p,
              quantity: p.quantity! + 1
            });
            return;
          }

          editedProducts.push(p);
          return;
        });

        if (isNewProduct) {
          editedProducts.push({ ...product, quantity: 1 });
        }

        return {
          order: {
            ...prevState.order,
            products: editedProducts
          },
          totalAmount: prevState.totalAmount + 1
        };
      },
      async () => {
        await localForage.setItem('currentOrder', this.state.order);
        await localForage.setItem('totalAmount', this.state.totalAmount);
      }
    );
  };

  decrement = async (product: Product) => {
    this.setState(
      prevState => {
        let isNewProduct = true;

        const editedProducts: Product[] = [];
        prevState.order.products.forEach(p => {
          if (p.id === product.id) {
            isNewProduct = false;

            if (p.quantity! === 1) {
              return;
            }

            editedProducts.push({
              ...p,
              quantity: p.quantity! - 1
            });
            return;
          }

          editedProducts.push(p);
          return;
        });

        if (isNewProduct) {
          return {
            ...prevState
          };
        }

        return {
          order: {
            ...prevState.order,
            products: editedProducts
          },
          totalAmount: prevState.totalAmount - 1
        };
      },
      async () => {
        await localForage.setItem('currentOrder', this.state.order);
        await localForage.setItem('totalAmount', this.state.totalAmount);
      }
    );

    // let { totalAmount } = this.state;

    // const productIndex = this.findProductIndex(product.id);

    // if (productIndex >= 0) {
    //   if (products[productIndex].quantity) {
    //     /**
    //      * Gets the old quantity and remove 1, deletes the product if it's less than or eq. to 0
    //      */
    //     const oldQuantity = products[productIndex].quantity;
    //     if (oldQuantity) {
    //       if (oldQuantity - 1 > 0) {
    //         products[productIndex].quantity = oldQuantity - 1;
    //       } else {
    //         products.splice(productIndex, 1);
    //       }
    //     }
    //   }
    // } else {
    //   return;
    // }

    // totalAmount--;
    // this.setState(
    //   prevState => ({
    //     order: { ...prevState.order, products },
    //     totalAmount
    //   }),
    //   async () => {
    //     await localForage.setItem('currentOrder', this.state.order);
    //     await localForage.setItem('totalAmount', this.state.totalAmount);
    //   }
    // );
  };

  comment = (comment: string) => {
    this.setState(
      prevState => ({ order: { ...prevState.order, comment } }),
      async () => {
        await localForage.setItem('currentOrder', this.state.order);
      }
    );
  };

  setTable = (id: string) => {
    this.setState(
      prevState => ({ order: { ...prevState.order, table: id } }),
      async () => {
        await localForage.setItem('currentOrder', this.state.order);
        await localForage.setItem('table', id);
      }
    );
  };

  addToHistory = (order: Order) => {
    const { orderHisotry } = { ...this.state };
    orderHisotry.push(order);

    this.setState({ orderHisotry });
  };

  componentDidMount() {
    this.syncWithLocalForage();
  }

  render() {
    const { order, table, totalAmount } = this.state;
    return (
      <CustomerContext.Provider
        value={{
          order,
          totalAmount,
          socket,
          table,
          actions: {
            reload: this.syncWithLocalForage,
            clear: this.clear,
            increment: this.increment,
            decrement: this.decrement,
            comment: this.comment,
            setTable: this.setTable,
            addToHistory: this.addToHistory
          }
        }}
      >
        {this.props.children}
      </CustomerContext.Provider>
    );
  }
}

const CartConsumer = CustomerContext.Consumer;

export default CustomerContextProvider;
export { CartConsumer };
