import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  login(username: string, pass: string) {
    const admin = this.db.getAdmin();
    if (username === admin.username && pass === admin.passwordHash) {
      const payload = { username: admin.username, role: 'admin' };
      return {
        accessToken: this.jwtService.sign(payload),
        user: { username: admin.username, role: 'admin' },
      };
    }
    throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu Admin');
  }

  logout() {
    return { success: true, message: 'Đã đăng xuất thành công' };
  }
}
