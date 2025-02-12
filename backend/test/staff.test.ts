import faker from 'faker';
import { Server } from 'http';
import request from 'supertest';
import { getRepository, Repository } from 'typeorm';
import { initServer } from '../src';
import { INITIAL_ADMIN_PASS } from '../src/config';
import { redisConnection } from '../src/connections';
import { User } from '../src/entities';
import { createInitialAdmin } from '../src/utils';

let server: Server;
let userRepository: Repository<User>;
let adminCookie: string;

beforeAll(async () => {
  server = await initServer();
  userRepository = getRepository(User);

  await createInitialAdmin();

  const user: Partial<User> = {
    email: 'admin@deliriumproducts.me',
    password: INITIAL_ADMIN_PASS
  };

  const { header } = await request(server)
    .post('/staff/auth/login')
    .send(user);

  adminCookie = header['set-cookie'][0].split(/,(?=\S)/).map((item: string) => item.split(';')[0]);
});

describe('Staff controller', () => {
  describe('POST /staff/auth/register', () => {
    it('adds a valid user to the database when registering', async () => {
      const user: Partial<User> = {
        email: 'validuser' + faker.internet.exampleEmail(),
        name: faker.name.findName(),
        password: 'FAKEpassword123VALID-REGISTRATION'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).toMatchObject(userWithoutPassword);
    });

    it('sets the default role to waiter, when none is passed', async () => {
      const user: Partial<User> = {
        email: 'set-waiter' + faker.internet.exampleEmail(),
        name: faker.name.findName(),
        password: 'FAKEpassword123SET-WAITER'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).toMatchObject({ ...userWithoutPassword, role: 'Waiter' });
    });

    it('sets the default role to waiter, when any is passed', async () => {
      const user: Partial<User> = {
        email: 'set-waiter-any' + faker.internet.exampleEmail(),
        name: faker.name.findName(),
        role: 'Admin',
        password: 'FAKEpassword123SET-WAITER-ANY'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, role, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).toMatchObject({ ...userWithoutPassword, role: 'Waiter' });
    });

    it('throws an error when registering a user with an invalid email', async () => {
      const user: Partial<User> = {
        email: 'this_is-not_an_email123',
        name: faker.name.findName(),
        password: 'FAKEpassword123INVALID-EMAIL'
      };

      const { body } = await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(400);

      expect(body).toEqual({
        errors: ['email must be an email'],
        name: 'NotValidError',
        message: 'User not valid!'
      });

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).not.toBeDefined();
    });

    it('throws an error when registering a user with an invalid password', async () => {
      const user: Partial<User> = {
        email: faker.internet.exampleEmail(),
        name: faker.name.findName(),
        password: 'remember'
      };

      const { body } = await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(400);

      expect(body).toEqual({
        errors: [
          // tslint:disable-next-line
          'Password must contain at least 1 lowercase alphabetical character, 1 numeric character and be at least 8 characters long'
        ],
        name: 'NotValidError',
        message: 'User not valid!'
      });

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).not.toBeDefined();
    });

    it('throws an error when registering a user with all fields invalid', async () => {
      const user: Partial<User> = {
        email: 'not-an-email',
        name: '',
        password: 'badpass'
      };

      const { body } = await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(400);

      expect(body).toEqual({
        errors: [
          'name must be longer than or equal to 1 characters',
          'email must be an email',
          // tslint:disable-next-line
          'Password must contain at least 1 lowercase alphabetical character, 1 numeric character and be at least 8 characters long'
        ],
        name: 'NotValidError',
        message: 'User not valid!'
      });

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).not.toBeDefined();
    });

    it('throws an error when registering a user with a duplicate email', async () => {
      const user: Partial<User> = {
        email: faker.internet.exampleEmail(),
        name: 'John Doe',
        password: 'FAKEpassword123DUPLICATE-EMAIL'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const duplicateUser: Partial<User> = {
        ...user,
        name: 'Sam Doe'
      };

      const { body } = await request(server)
        .post('/staff/auth/register')
        .send(duplicateUser)
        .expect(422);

      expect(body).toEqual({
        name: 'DuplicateError',
        message: 'Duplicate User entry!'
      });

      const { password, ...userWithoutPassword } = duplicateUser;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).not.toBeDefined();
    });
  });

  describe('GET /staff', () => {
    it('gets all the staff members', async () => {
      const { body } = await request(server)
        .get('/staff')
        .set('Cookie', adminCookie)
        .expect(200);

      const staffQuery = await userRepository.find();

      expect(staffQuery).toMatchObject(body);
    });

    it('gets all the staff members on a given page', async () => {
      const { body } = await request(server)
        .get('/staff?page=1')
        .set('Cookie', adminCookie)
        .expect(200);

      const staffQuery = await userRepository.find({
        skip: 0,
        take: 0
      });

      expect(staffQuery).toMatchObject(body);
    });

    it('gets all the staff members with a limit', async () => {
      const { body } = await request(server)
        .get('/staff?limit=1')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(body).toHaveLength(1);

      const staffQuery = await userRepository.find({
        take: 1
      });

      expect(staffQuery).toMatchObject(body);
    });
  });

  describe('PUT /staff', () => {
    it('should update the role of a registered user', async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: 'UPDATE-ROLE' + faker.internet.exampleEmail(),
        password: 'FAKEpassword123UPDATE-ROLE'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });
      if (userQuery) {
        const { id } = userQuery;

        await request(server)
          .put(`/staff/${id}`)
          .send({
            role: 'Admin'
          })
          .set('Cookie', adminCookie)
          .expect(200);

        const userQuery1 = await userRepository.findOne(id);

        expect(userQuery1).toEqual({
          ...userQuery,
          role: 'Admin'
        });
      }
    });

    it('should return the user without their password after updating their role', async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: 'RETURN-USER-ROLE' + faker.internet.exampleEmail(),
        password: 'FAKEpassword123RETURN-USER-ROLE'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });
      if (userQuery) {
        const { id } = userQuery;

        const { body } = await request(server)
          .put(`/staff/${id}`)
          .send({
            role: 'Admin'
          })
          .set('Cookie', adminCookie)
          .expect(200);

        expect(body).toEqual({
          ...userWithoutPassword,
          role: 'Admin',
          isVerified: false,
          id
        });
      }
    });

    it('should throw an error when trying to update the role of a non-existing user', async () => {
      const { body } = await request(server)
        .put(`/staff/${-420}`)
        .send({
          role: 'Admin'
        })
        .set('Cookie', adminCookie)
        .expect(404);

      expect(body).toEqual({
        message: 'User not found!',
        name: 'NotFoundError'
      });
    });

    it('should throw an error when trying to update the role of a themselves', async () => {
      const adminQuery = await userRepository.findOne({
        where: {
          email: 'admin@deliriumproducts.me'
        }
      });

      if (adminQuery) {
        const { body } = await request(server)
          .put(`/staff/${adminQuery.id}`)
          .send({
            role: 'Waiter'
          })
          .set('Cookie', adminCookie)
          .expect(400);
        expect(body).toEqual({
          errors: ['cannot edit own role'],
          message: 'User not valid!',
          name: 'NotValidError'
        });

        const adminQuery1 = await userRepository.findOne({
          where: {
            email: 'admin@deliriumproducts.me'
          }
        });

        expect(adminQuery1).not.toEqual({
          ...adminQuery,
          role: 'Waiter'
        });
      }
    });

    it(`should throw an error when trying to update the role to a one that doesn't exist`, async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: 'INVALID-UPDATE-ROLE' + faker.internet.exampleEmail(),
        password: 'FAKEpassword123INVALID-UPDATE-ROLE'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      if (userQuery) {
        const { id } = userQuery;

        const { body } = await request(server)
          .put(`/staff/${id}`)
          .send({
            role: 'BAD-ROLE'
          })
          .set('Cookie', adminCookie)
          .expect(400);

        expect(body).toEqual({
          errors: ['role must be one of the following values: Admin,Waiter,Cook'],
          message: 'User not valid!',
          name: 'NotValidError'
        });

        const userQuery1 = await userRepository.findOne(id);

        expect(userQuery1).not.toEqual({
          ...userQuery,
          role: 'BAD-ROLE'
        });
      }
    });
  });

  describe('DELETE /staff', () => {
    it('should delete users from the database', async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: 'DELETE' + faker.internet.exampleEmail(),
        password: 'FAKEpassword123DELETE'
      };

      await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      if (userQuery) {
        const { id } = userQuery;

        await request(server)
          .delete(`/staff/${id}`)
          .set('Cookie', adminCookie)
          .expect(200);

        const userQuery1 = await userRepository.findOne({ where: { ...userWithoutPassword } });

        expect(userQuery1).not.toBeDefined();
      }
    });

    it(`throws an error when trying to delete a user that doesn't exist`, async () => {
      const { body } = await request(server)
        .delete(`/staff/${-420}`)
        .set('Cookie', adminCookie)
        .expect(404);

      expect(body).toEqual({
        message: 'User not found!',
        name: 'NotFoundError'
      });
    });
  });

  describe('GET /confirm/:tokenId', () => {
    it('confirms the user in the database', async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: 'CONFIRM' + faker.internet.exampleEmail(),
        password: 'FAKEpassword123CONFIRM-USER'
      };

      const { body: confirmationURL } = await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      const { password, ...userWithoutPassword } = user;

      const userQuery = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery).toMatchObject({
        ...userWithoutPassword,
        isVerified: false
      });

      await request(server)
        .get(confirmationURL)
        .set('Cookie', adminCookie)
        .expect(200);

      const userQuery1 = await userRepository.findOne({ where: { ...userWithoutPassword } });

      expect(userQuery1).toMatchObject({
        ...userWithoutPassword,
        isVerified: true
      });
    });

    it('throws an error when trying to confirm a non existing user', async () => {
      const { body } = await request(server)
        .get(`/confirm/${-420}`)
        .set('Cookie', adminCookie)
        .expect(404);

      expect(body).toEqual({
        message: 'User not found!',
        name: 'NotFoundError'
      });
    });

    it('throws an error when trying to confirm an already confirmed user', async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: 'CONFIRM-ALREADY' + faker.internet.exampleEmail(),
        password: 'FAKEpassword123CONFIRM-ALREADY'
      };

      const { body: confirmationURL } = await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      await request(server)
        .get(confirmationURL)
        .set('Cookie', adminCookie)
        .expect(200);

      const { body } = await request(server)
        .get(confirmationURL)
        .set('Cookie', adminCookie)
        .expect(400);

      expect(body).toEqual({
        message: 'User already verified',
        name: 'BadRequestError'
      });
    });
  });

  describe('POST /staff/auth/login', () => {
    const registeredUser: Partial<User> = {
      name: faker.name.findName(),
      email: 'REGISTERLOGIN' + faker.internet.exampleEmail(),
      password: 'FAKEpassword123REGISTERAUTH'
    };

    beforeAll(async () => {
      await request(server)
        .post('/staff/auth/register')
        .send(registeredUser)
        .expect(200);
    });

    it('logs a user in after confirming token', async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: 'login1' + faker.internet.exampleEmail(),
        password: 'FAKEpassword123LOGIN-USER'
      };

      const { body: confirmationURL } = await request(server)
        .post('/staff/auth/register')
        .send(user)
        .expect(200);

      await request(server)
        .get(confirmationURL)
        .set('Cookie', adminCookie)
        .expect(200);

      const { body, header } = await request(server)
        .post('/staff/auth/login')
        .send(user)
        .expect(200);

      expect(body).toEqual('User logged in!');

      const cookie = header['set-cookie'][0]
        .split(/,(?=\S)/)
        .map((item: string) => item.split(';')[0]);

      const { body: isLoggedIn } = await request(server)
        .get('/staff/auth')
        .set('Cookie', cookie)
        .expect(200);

      expect(isLoggedIn.isAuthenticated).toEqual(true);
    });

    it('throws an error when logging in with an unconfirmed user', async () => {
      const { text } = await request(server)
        .post('/staff/auth/login')
        .send(registeredUser)
        .expect(401);

      expect(text).toEqual('Unauthorized');
    });

    it('throws an error when logging in with an incorrect password', async () => {
      const { text } = await request(server)
        .post('/staff/auth/login')
        .send({ ...registeredUser, password: 'WRONGpassword123' })
        .expect(401);

      expect(text).toEqual('Unauthorized');
    });

    it('throws an error when logging in with an non-existing user', async () => {
      const user: Partial<User> = {
        name: faker.name.findName(),
        email: faker.internet.exampleEmail(),
        password: 'QualityPassword123'
      };

      const { text } = await request(server)
        .post('/staff/auth/login')
        .send(user)
        .expect(401);

      expect(text).toEqual('Unauthorized');
    });
  });

  describe('GET /staff/auth/logout', () => {
    const registeredUser: Partial<User> = {
      name: faker.name.findName(),
      email: 'logout' + faker.internet.exampleEmail(),
      password: 'FAKEpassword123LOGOUT-LOGIN'
    };

    let cookie: string;

    beforeAll(async () => {
      const { body: confirmationURL } = await request(server)
        .post('/staff/auth/register')
        .send(registeredUser)
        .expect(200);

      await request(server)
        .get(confirmationURL)
        .set('Cookie', adminCookie)
        .expect(200);

      const { header } = await request(server)
        .post('/staff/auth/login')
        .send(registeredUser)
        .expect(200);

      cookie = header['set-cookie'][0].split(/,(?=\S)/).map((item: string) => item.split(';')[0]);
    });

    it('logs a user out after logging in', async () => {
      const { body } = await request(server)
        .get('/staff/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      expect(body).toEqual('User logged out!');
    });

    it('throws an error when logging out without logging in', async () => {
      const { body } = await request(server)
        .get('/staff/auth/logout')
        .expect(200);

      expect(body).toEqual('Login to logout!');
    });
  });
});

afterAll(async () => {
  await redisConnection.quit();
});
