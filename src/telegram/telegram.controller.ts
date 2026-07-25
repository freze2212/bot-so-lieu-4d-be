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
  sendNow(@Body() body: { botToken?: string; chatId?: string; feUrl?: string; messageText?: string }) {
    return this.telegramService.sendDailyReminder(body.botToken, body.chatId, body.feUrl, body.messageText);
  }
}
