import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username?: string, pass?: string) {
    if (!username || !pass) {
      throw new BadRequestException('Vui lòng nhập Tên tài khoản và Mật khẩu Admin');
    }

    const admin = await this.db.getAdmin();

    const reqUser = username.trim().toLowerCase();
    const reqPass = pass.trim();

    const dbUser = (admin.username || 'admin').trim().toLowerCase();
    const dbPass = (admin.passwordHash || 'admin123').trim();

    if (reqUser === dbUser) {
      const isMatch = await this.db.verifyPassword(reqPass, dbPass);
      if (isMatch) {
        const payload = { username: admin.username, role: 'admin' };
        return {
          accessToken: this.jwtService.sign(payload),
          user: { username: admin.username, role: 'admin' },
        };
      }
    }

    throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu Admin');
  }

  async changePassword(oldPassword?: string, newPassword?: string) {
    if (!oldPassword || !newPassword) {
      throw new BadRequestException('Vui lòng nhập Mật khẩu hiện tại và Mật khẩu mới');
    }
    if (newPassword.trim().length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
    }
    const result = await this.db.updateAdminPassword(oldPassword.trim(), newPassword.trim());
    if (!result.success) {
      throw new BadRequestException(result.error || 'Đổi mật khẩu thất bại!');
    }
    return { success: true, message: 'Đổi mật khẩu Admin thành công!' };
  }

  logout() {
    return { success: true, message: 'Đã đăng xuất thành công' };
  }
}
