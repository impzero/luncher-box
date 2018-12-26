import { JsonController, Get, Post, Body, Req, UseBefore } from 'routing-controllers';
import { Request } from 'express';
import nodemailer from 'nodemailer';
import passport from 'passport';
import { User, UserNotValidError, DuplicateUserError, UserNotFoundError, Token } from '../entities';
import { Repository, getRepository } from 'typeorm';
import { TransformValidationOptions } from 'class-transformer-validator';
import { TransformAndValidateTuple } from '../types';
import { OWNER_EMAIL, OWNER_PASS, VERIFIER_EMAIL } from '../config';
import { transformAndValidate } from '../utils';

@JsonController('/auth')
export class UserController {
  private userRepository: Repository<User>;
  private tokenRepository: Repository<Token>;
  private transformAndValidateUser: (
    obj: object | Array<{}>,
    options?: TransformValidationOptions
  ) => TransformAndValidateTuple<User>;

  /**
   * Load the User repository
   */
  constructor() {
    this.userRepository = getRepository(User);
    this.tokenRepository = getRepository(Token);
    this.transformAndValidateUser = transformAndValidate(User);
  }

  /**
   * GET /auth
   *
   * Check if the user has been authenticated
   */
  @Get()
  isAuthenticated(@Req() req: Request) {
    return req.isAuthenticated();
  }

  /**
   * POST /auth/register
   *
   * Register a user based on the request's body
   * @param userJSON
   */
  @Post('/register')
  async register(@Body() userJSON: User, @Req() req: Request) {
    /**
     * Check if there is a user already registered with the given email
     */
    if (await this.userRepository.findOne({ where: { email: userJSON.email } })) {
      throw new DuplicateUserError();
    }

    const [user, err] = await this.transformAndValidateUser(userJSON);

    if (err.length) {
      throw new UserNotValidError(err);
    }

    const userEntity = await this.userRepository.save(user);

    /**
     * Generate verification token and save it
     */
    const token = new Token();
    token.user = userEntity;
    await this.tokenRepository.save(token);

    /**
     * Send verification email
     */
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: OWNER_EMAIL,
        pass: OWNER_PASS
      }
    });

    const confirmationURL = `http://${req.headers.host}/confirm/${token.id}`;

    const mailOptions = {
      from: OWNER_EMAIL,
      to: VERIFIER_EMAIL,
      subject: 'Luncher Box Account Verification',
      text: `Hello,
Please verify ${user.name}'s account by clicking the following link: ${confirmationURL}.`
    };

    try {
      await transporter.sendMail(mailOptions);
      return 'Verification email sent!';
    } catch (error) {
      return 'Verification email not sent!';
    }
  }

  /**
   * POST /auth/login
   *
   * Login a user based on the request body
   */
  @Post('/login')
  @UseBefore(passport.authenticate('local'))
  async login(@Req() req: Request) {
    if (req.user) {
      return 'User logged in!';
    }

    throw new UserNotFoundError();
  }

  /**
   * GET /auth/logout
   *
   * Logout a user
   */
  @Get('/logout')
  async logout(@Req() req: Request) {
    if (req.user) {
      req.logout();
      return 'User logged out!';
    }

    return 'Login to logout!';
  }
}
