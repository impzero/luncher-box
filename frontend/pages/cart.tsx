import UserLayout from '../components/UserLayout';
import ItemCard from '../components/ItemCard';
import styled from 'styled-components';
import { CartContext } from '../context';
import { Empty, Card, Button, InputNumber } from 'antd';
import React from 'react';
import { Product } from '../interfaces';
import { Input } from 'antd';
import io from 'socket.io-client';
import { BACKEND_URL } from '../config';

const { TextArea } = Input;

const StyledCard = styled(Card)`
  margin: 8px 4px 0 4px;
  border-radius: 7px;
  border: none;
  display: flex;
  .ant-card-body {
    padding-bottom: 0;
    padding-top: 0;
  }
  width: 100%;
  flex-direction: column;
  text-align: center;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.12);
`;

const FlexContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  flex-direction: column;
  @media (min-width: 768px) {
    margin: auto;
    width: 70%;
  }
`;

interface State {
  modalVisible: boolean;
}

export default class extends React.Component<any, State> {
  static contextType = CartContext;
  context!: React.ContextType<typeof CartContext>;
  socket: SocketIOClient.Socket;

  state: State = {
    modalVisible: false
  };

  componentDidMount() {
    this.socket = io(`${BACKEND_URL}`);
  }

  placeOrder = () => {
    /**
     * Remove the actions and the totalAmount before sending to the backend
     */
    const { order } = this.context;
    this.socket.emit('place_order', order);
  };

  handleComment = (e: React.FormEvent<HTMLTextAreaElement>) => {
    this.context.actions.comment(e.currentTarget.value);
  };

  handleTable = (e: React.FormEvent<HTMLInputElement>) => {
    this.context.actions.setTable(e.currentTarget.value);
  };

  render() {
    return (
      <UserLayout selectedKey="cart">
        <FlexContainer>
          {this.context.order && this.context.order.products.length ? (
            <>
              {this.context.order.products.map((product: Product) => (
                <ItemCard
                  interactive
                  id={product.id}
                  key={product.id}
                  name={product.name}
                  description={product.description}
                  image={product.image}
                  price={product.price}
                  quantity={product.quantity}
                />
              ))}
              <StyledCard>
                <TextArea
                  placeholder="Write comments in case you are allergic to ingredients or want to exclude some. e.g. no onions, no mayo. "
                  onChange={this.handleComment}
                  rows={6}
                  style={{ width: '100%', marginTop: '2%' }}
                />
                <div style={{ display: 'flex' }}>
                  <Input
                    placeholder="Enter table e.g. A1, A2 etc."
                    onChange={this.handleTable}
                    style={{ marignLeft: '1%', marginTop: '2%' }}
                    size="large"
                  />
                </div>
                <Button
                  type="primary"
                  style={{ marginBottom: '2%', marginTop: '2%' }}
                  onClick={this.placeOrder}
                >
                  Place order!
                </Button>
              </StyledCard>
            </>
          ) : (
            <Empty description="No products">
              No items added to the cart yet. Go and add some!
            </Empty>
          )}
        </FlexContainer>
      </UserLayout>
    );
  }
}
