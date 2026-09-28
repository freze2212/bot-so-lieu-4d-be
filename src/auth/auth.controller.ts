import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return await this.authService.login(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Body() body: { oldPassword?: string; newPassword?: string }) {
    return await this.authService.changePassword(body.oldPassword, body.newPassword);
  }

  @Post('logout')
  logout() {
    return this.authService.logout();
  }
}
