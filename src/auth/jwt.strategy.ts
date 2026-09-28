import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'SECRET_KEY_TELE_ADMIN_STATISTICS_2026',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || payload.role !== 'admin') {
      throw new UnauthorizedException('Không có quyền truy cập hệ thống');
    }
    return { username: payload.username, role: payload.role };
  }
}
