import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface TelegramBotConfig {
  botToken: string;
  chatId: string;
  scheduleTime: string; // "13:00"
  feUrl: string; // "https://baocao6f.online"
  enabled: boolean;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private config: TelegramBotConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    scheduleTime: process.env.SCHEDULE_TIME || '13:00',
    feUrl: process.env.FE_URL || 'https://baocao4d.online',
    enabled: true,
  };

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    // Check every minute for scheduled time match
    setInterval(() => {
      this.checkScheduleAndSend();
    }, 60000);
  }

  getConfig(): TelegramBotConfig {
    return this.config;
  }

  updateConfig(newConfig: Partial<TelegramBotConfig>): TelegramBotConfig {
    this.config = { ...this.config, ...newConfig };
    this.logger.log(`Updated Telegram config: time=${this.config.scheduleTime}, enabled=${this.config.enabled}`);
    return this.config;
  }

  private async checkScheduleAndSend() {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      return;
    }

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentHHMM === this.config.scheduleTime) {
      this.logger.log(`⏰ Scheduled time hit (${currentHHMM})! Sending reminder to Telegram group...`);
      try {
        await this.sendDailyReminder();
      } catch (err) {
        this.logger.error('Failed to send scheduled reminder:', err);
      }
    }
  }

  async sendDailyReminder(testBotToken?: string, testChatId?: string, testFeUrl?: string) {
    const token = (testBotToken !== undefined ? testBotToken : this.config.botToken || '').trim();
    const chatId = (testChatId !== undefined ? testChatId : this.config.chatId || '').trim();
    let feUrl = (testFeUrl !== undefined ? testFeUrl : this.config.feUrl || 'https://baocao4d.online').trim();

    if (!token) {
      throw new BadRequestException('Chưa nhập Telegram Bot Token!');
    }
    if (!chatId) {
      throw new BadRequestException('Chưa nhập Chat ID Nhóm Telegram!');
    }

    // Telegram API requires a public domain or https:// URL for inline keyboard buttons.
    // http://localhost is rejected by Telegram Bot API.
    if (feUrl.includes('localhost') || feUrl.includes('127.0.0.1')) {
      throw new BadRequestException(
        'Telegram API quy định nút bấm Inline Button phải là đường dẫn công khai có tên miền / HTTPS (ví dụ: https://baocao6f.online). Vui lòng nhập link domain công khai thay vì http://localhost!'
      );
    }

    if (!feUrl.startsWith('http://') && !feUrl.startsWith('https://')) {
      feUrl = `https://${feUrl}`;
    }

    const messageText =
`🤖📊 BOT BÁO CÁO HẰNG NGÀY 📊🤖

Tới giờ báo cáo số liệu hôm nay rồi nha anh em ✨

Mọi người chỉ cần bấm nút bên dưới và nhập CODE cá nhân là có thể báo cáo ngay 🚀

📝 Nếu nhập sai số liệu vẫn có thể vào chỉnh sửa lại sau đó nha~

⚠️ Mọi người nhớ báo cáo đầy đủ và đúng giờ quy định.

Đúng 13:00 ngày mai em sẽ tổng hợp lại danh sách các trường hợp:
• Chưa báo cáo
• Báo cáo thiếu
• Báo sai số liệu

và gửi anh NICE (@N_I_C_E_838) để xử lý theo quy định của team 😈`;

    const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: messageText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📝 Báo Cáo Ngay',
              url: feUrl,
            },
          ],
          [
            {
              text: '🔗 Dashboard',
              url: feUrl.includes('?') ? `${feUrl}&mode=admin` : `${feUrl}?mode=admin`,
            },
          ],
        ],
      },
    };

    try {
      const res = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        const teleErr = data.description || 'Lỗi gửi tin nhắn Telegram';

        if (teleErr.includes('chat not found')) {
          throw new BadRequestException(
            'Lỗi "Chat not found": Không tìm thấy nhóm Telegram! Bạn đã THÊM BOT VÀO NHÓM và kiểm tra đúng Chat ID (dạng số âm như -100xxxxxxxxxx) chưa?'
          );
        } else if (teleErr.includes('Wrong HTTP URL') || teleErr.includes('invalid')) {
          throw new BadRequestException(
            'Lỗi "Wrong HTTP URL": Telegram yêu cầu nút bấm phải là link HTTPS công khai (VD: https://baocao6f.online). Vui lòng đổi link localhost thành tên miền web.'
          );
        } else if (teleErr.includes('Unauthorized') || teleErr.includes('bot token')) {
          throw new BadRequestException(
            'Lỗi "Unauthorized": Bot Token không hợp lệ. Vui lòng kiểm tra lại Token lấy từ @BotFather.'
          );
        } else {
          throw new BadRequestException(`Lỗi Telegram API: ${teleErr}`);
        }
      }

      this.logger.log(`Successfully sent Telegram message to chat ${chatId}`);
      return { success: true, telegramResponse: data };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(`Lỗi kết nối API Telegram: ${err.message}`);
    }
  }
}
