import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UsersService } from '../users/users.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // REGISTER
  // ============================================================

  async register(dto: RegisterDto) {
    const passwordHash =
      await argon2.hash(dto.password);

    const user =
      await this.usersService.create({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      });

    return this.usersService.sanitizeUser(user);
  }

  // ============================================================
  // LOGIN
  // ============================================================

  async login(dto: LoginDto) {
    const user =
      await this.usersService.findByEmail(
        dto.email,
      );

    if (!user || !user.active) {
      throw new UnauthorizedException(
        'Credenciales inválidas',
      );
    }

    const passwordValid =
      await argon2.verify(
        user.passwordHash,
        dto.password,
      );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Credenciales inválidas',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
      );

    return {
      accessToken,
      user: this.usersService.sanitizeUser(
        user,
      ),
    };
  }

  // ============================================================
  // VALIDAR JWT
  // ============================================================

  async validateUser(userId: string) {
    const user =
      await this.usersService.findById(
        userId,
      );

    if (!user.active) {
      throw new UnauthorizedException(
        'Usuario inactivo',
      );
    }

    return this.usersService.sanitizeUser(
      user,
    );
  }
}