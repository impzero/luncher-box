import axios from 'axios';
import { Product } from '../interfaces';
import { BACKEND_URL } from './../config';

export class ProductAPI {
  static opts = {
    withCredentials: true
  };

  static async getAll(
    opts: { since?: number; page?: number; limit?: number } = {}
  ) {
    if (!opts.limit) {
      opts.limit = 0;
    }

    if (opts.since) {
      const products: Product[] = (await axios.get(
        `${BACKEND_URL}/products?since=${opts.since}&limit=${opts.limit}`
      )).data;

      return products;
    }

    if (opts.page) {
      const products: Product[] = (await axios.get(
        `${BACKEND_URL}/products?page=${opts.page}&limit=${opts.limit}`
      )).data;

      return products;
    } else {
      const products: Product[] = (await axios.get(
        `${BACKEND_URL}/products?limit=${opts.limit}`
      )).data;

      return products;
    }
  }

  static async getOne(id: number) {
    const product: Product = (await axios.get(`${BACKEND_URL}/products/${id}`))
      .data;

    return product;
  }

  static async create(product: Product) {
    /**
     * As the backend requires an array of objects which contain the Ids as numbers,
     * we map through the categories array and create a new one
     * The next line is ignored, due to the fact that we have to overwrite the default structure
     */
    // @ts-ignore
    product.categories = product.categories.map((categoryId: number) => ({
      id: Number(categoryId)
    }));

    /**
     * As the backend requires an actual number instead of a string for the price, we convert it to one
     */
    product.price = Number(product.price);

    const response = await axios.post(
      `${BACKEND_URL}/products`,
      product,
      this.opts
    );

    return response;
  }

  static async edit(product: Product) {
    const { id } = product;

    /**
     * As the backend requires an array of objects which contain the Ids as numbers,
     * we map through the categories array and create a new one
     * The next line is ignored, due to the fact that we have to overwrite the default structure
     */
    // @ts-ignore
    product.categories = product.categories.map((categoryId: number) => ({
      id: Number(categoryId)
    }));

    /**
     * As the backend requires an actual number instead of a string for the price, we convert it to one
     */
    product.price = Number(product.price);

    const response = await axios.put(
      `${BACKEND_URL}/products/${id}`,
      product,
      this.opts
    );

    return response;
  }

  static async delete(id: number) {
    const response = await axios.delete(
      `${BACKEND_URL}/products/${id}`,
      this.opts
    );

    return response;
  }
}
