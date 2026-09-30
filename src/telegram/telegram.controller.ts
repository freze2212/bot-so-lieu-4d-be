import { Controller, Get, Post, Body } from '@nestjs/common';
import { TelegramService, TelegramBotConfig } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('config')
  getConfig() {
    return this.telegramService.getConfig();
  }

  @Post('config')
  updateConfig(@Body() body: Partial<TelegramBotConfig>) {
    return this.telegramService.updateConfig(body);
  }

  @Post('send-now')
  async sendNow(@Body() body: { botToken?: string; chatId?: string; feUrl?: string; messageText?: string }) {
    return await this.telegramService.sendDailyReminder(body.botToken, body.chatId, body.feUrl, body.messageText);
  }

  @Post('send-unreported-now')
  async sendUnreportedNow(@Body() body: { botToken?: string; chatId?: string; feUrl?: string; unreportedMessageText?: string }) {
    return await this.telegramService.sendUnreportedReminder(body.botToken, body.chatId, body.feUrl, body.unreportedMessageText);
  }

  @Get('unreported-status')
  async getUnreportedStatus() {
    return await this.telegramService.getTodayUnreportedEmployees();
  }
}
