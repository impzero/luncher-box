import { Card, Popconfirm } from 'antd';
import Router from 'next/router';
import React from 'react';
import styled from 'styled-components';
import { Category, Product } from '../interfaces';
import { EntityInstance, EntityTypes } from '../types';
import ActionButton from './ActionButton';
import PriceBadge from './PriceBadge';

const { Meta } = Card;

const StyledCard = styled(Card)`
  border-radius: 7px;
  margin-top: 15px;
  box-shadow: 0 20px 24px -18px rgba(0, 0, 0, 0.31);
  max-width: 100%;

  @media (max-width: 480px) {
    border-radius: 0;
    border-bottom: 1px solid;
    border-color: rgb(210, 210, 210);
    box-shadow: none;
    margin: 0;
    width: 100%;
  }

  .ant-card-actions {
    background-color: #fff;
    border-top-color: rgb(210, 210, 210);
    border-radius: 0 0 7px 7px;
  }
`;

const StyledImg = styled.img`
  border-radius: 7px;
  width: 88px;
  height: 88px;
  object-fit: cover;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.12);

  @media (max-width: 480px) {
    margin-left: 10px;
  }

  @media (max-width: 250px) {
    display: none;
  }
`;

const StyledMeta = styled(Meta)`
  display: flex;
  align-items: center;

  & * {
    font-size: 15px;
    white-space: initial;
    word-wrap: break-word;
  }

  .ant-card-meta-title {
    font-weight: bold;
  }
`;

interface Props {
  id: number;
  name: string;
  description?: string;
  image: string;
  price?: number;
  categories?: Category[];
  entityType: EntityTypes;
  hoverable?: boolean;

  handleEditClick: (
    e: React.FormEvent<HTMLButtonElement>,
    entityType: EntityTypes,
    entity: EntityInstance
  ) => void;

  handleDeleteClick: (
    e: React.FormEvent<HTMLButtonElement>,
    entity: EntityInstance
  ) => void;
}

const EntityCard: React.FunctionComponent<Props> = props => {
  const {
    entityType,
    id,
    hoverable,
    handleEditClick,
    handleDeleteClick
  } = props;

  const handleCardClick = () => {
    if (entityType === 'category') {
      Router.push(
        {
          pathname: '/admin/category',
          query: {
            categoryId: id
          }
        },
        {
          pathname: `/admin/category/${id}`
        }
      );
    } else {
      return;
    }
  };

  const entity: EntityInstance =
    entityType === 'product'
      ? ({
          id: props.id,
          name: props.name,
          description: props.description,
          image: props.image,
          price: props.price,
          categories: props.categories
        } as Product)
      : ({
          id: props.id,
          name: props.name,
          image: props.image
        } as Category);

  return (
    <StyledCard
      bordered={false}
      hoverable={entityType === 'category'}
      onClick={handleCardClick}
      actions={[
        <ActionButton
          key="edit"
          type="default"
          icon="edit"
          onClick={(e: React.FormEvent<HTMLButtonElement>) =>
            handleEditClick(e, entityType, entity)
          }
        >
          Edit
        </ActionButton>,
        <Popconfirm
          title={`Are you sure?`}
          onConfirm={(e: any) => handleDeleteClick(e, entity)}
          onCancel={(e: any) => e.stopPropagation()}
          okText="Yes"
        >
          <ActionButton
            key="delete"
            type="default"
            icon="delete"
            onClick={(e: React.FormEvent<HTMLButtonElement>) =>
              e.stopPropagation()
            }
          >
            Delete
          </ActionButton>
        </Popconfirm>
      ]}
    >
      <StyledMeta
        avatar={<StyledImg src={props.image} />}
        title={
          <>
            {props.name}
            <PriceBadge
              overflowCount={1000}
              count={props.price && `${props.price} / piece`}
              style={{
                marginLeft: '10px',
                zIndex: 0
              }}
            />
          </>
        }
        description={props.description}
      />
    </StyledCard>
  );
};

export default EntityCard;
