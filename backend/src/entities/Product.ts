import { Allow, IsNumber, IsUrl, Length, Max, Min } from 'class-validator';
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EntityError } from '../types';
import { EntityNotFoundError, EntityNotValidError } from '../utils';
import { Category } from './Category';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Length(2, 50)
  name: string;

  @Column('text')
  @Length(5, 255)
  description: string;

  @Column('text')
  @IsUrl()
  @Length(5, 255)
  image: string;

  @Column('double')
  @IsNumber()
  @Min(0)
  @Max(1000)
  price: number;

  @ManyToMany(() => Category, c => c.products, {
    cascade: false
  })
  @Allow()
  @JoinTable()
  categories: Category[];
}

export class ProductNotFoundError extends EntityNotFoundError<Product> {
  constructor() {
    super('Product');
  }
}

export class ProductNotValidError extends EntityNotValidError<Product> {
  constructor(errors: EntityError) {
    super('Product', errors);
  }
}
