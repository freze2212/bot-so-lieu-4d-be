import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { DatabaseService, Employee } from '../database/database.service';

const DEFAULT_TELEGRAM_MESSAGE = `🤖📊 BOT BÁO CÁO HẰNG NGÀY 📊🤖

Tới giờ báo cáo số liệu hôm nay rồi nha anh em ✨

Mọi người chỉ cần bấm nút bên dưới và nhập CODE cá nhân là có thể báo cáo ngay 🚀

📝 Nếu nhập sai số liệu vẫn có thể vào chỉnh sửa lại sau đó nha~

⚠️ Mọi người nhớ báo cáo đầy đủ và đúng giờ quy định.

Đúng 13:00 ngày mai em sẽ tổng hợp lại danh sách các trường hợp:
• Chưa báo cáo
• Báo cáo thiếu
• Báo sai số liệu

và gửi anh NICE (@N_I_C_E_838) để xử lý theo quy định của team 😈`;

const DEFAULT_UNREPORTED_MESSAGE = `⚠️ DANH SÁCH NHÂN VIÊN CHƯA BÁO CÁO HÔM NAY ({DATE}) ⚠️

Hôm nay vẫn còn {COUNT} nhân viên chưa gửi báo cáo:
{LIST}

📢 Mọi người khẩn trương bấm nút bên dưới nộp báo cáo đúng giờ nhé! 🚀`;

export interface TelegramBotConfig {
  botToken: string;
  chatId: string;
  scheduleTime: string; // "13:00"
  feUrl: string; // "https://baocao6f.online"
  enabled: boolean;
  messageText?: string;

  // Unreported employees reminder config
  unreportedEnabled: boolean;
  unreportedScheduleTime: string; // "18:00"
  unreportedMessageText?: string;
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
    messageText: DEFAULT_TELEGRAM_MESSAGE,
    unreportedEnabled: true,
    unreportedScheduleTime: process.env.UNREPORTED_SCHEDULE_TIME || '18:00',
    unreportedMessageText: DEFAULT_UNREPORTED_MESSAGE,
  };

  private lastSentGeneralMinute = '';
  private lastSentUnreportedMinute = '';

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    // Check every minute for scheduled time match
    setInterval(() => {
      this.checkScheduleAndSend();
    }, 60000);
  }

  getConfig(): TelegramBotConfig {
    if (!this.config.messageText) {
      this.config.messageText = DEFAULT_TELEGRAM_MESSAGE;
    }
    if (this.config.unreportedEnabled === undefined) {
      this.config.unreportedEnabled = true;
    }
    if (!this.config.unreportedScheduleTime) {
      this.config.unreportedScheduleTime = '18:00';
    }
    if (!this.config.unreportedMessageText) {
      this.config.unreportedMessageText = DEFAULT_UNREPORTED_MESSAGE;
    }
    return this.config;
  }

  updateConfig(newConfig: Partial<TelegramBotConfig>): TelegramBotConfig {
    this.config = { ...this.config, ...newConfig };
    this.logger.log(
      `Updated Telegram config: generalTime=${this.config.scheduleTime} (enabled=${this.config.enabled}), unreportedTime=${this.config.unreportedScheduleTime} (enabled=${this.config.unreportedEnabled})`,
    );
    return this.config;
  }

  async getTodayUnreportedEmployees(): Promise<{ missingEmployees: Employee[]; totalEmployeesCount: number; todayFormatted: string }> {
    const allEmployees = await this.db.getEmployees();

    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const todayFormatted = `${day}/${month}/${year}`;

    const reports = await this.db.getReports();

    const reportedCodes = new Set<string>();
    for (const r of reports) {
      if (r.date === todayStr && r.employeeCode) {
        reportedCodes.add(r.employeeCode.trim().toUpperCase());
      }
    }

    const missingEmployees = allEmployees.filter(
      (emp) => !reportedCodes.has(emp.code.trim().toUpperCase()),
    );

    return {
      missingEmployees,
      totalEmployeesCount: allEmployees.length,
      todayFormatted,
    };
  }

  private async checkScheduleAndSend() {
    if (!this.config.botToken || !this.config.chatId) {
      return;
    }

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];
    const minuteKey = `${todayStr}_${currentHHMM}`;

    // 1. Check General Daily Reminder
    if (this.config.enabled && currentHHMM === this.config.scheduleTime) {
      if (this.lastSentGeneralMinute !== minuteKey) {
        this.lastSentGeneralMinute = minuteKey;
        this.logger.log(`⏰ Scheduled time hit for General Reminder (${currentHHMM})! Sending to Telegram...`);
        try {
          await this.sendDailyReminder();
        } catch (err) {
          this.logger.error('Failed to send scheduled general reminder:', err);
        }
      }
    }

    // 2. Check Unreported Employees Reminder
    if (this.config.unreportedEnabled && currentHHMM === this.config.unreportedScheduleTime) {
      if (this.lastSentUnreportedMinute !== minuteKey) {
        this.lastSentUnreportedMinute = minuteKey;
        this.logger.log(`⏰ Scheduled time hit for Unreported Reminder (${currentHHMM})! Sending to Telegram...`);
        try {
          await this.sendUnreportedReminder();
        } catch (err) {
          this.logger.error('Failed to send scheduled unreported reminder:', err);
        }
      }
    }
  }

  async sendDailyReminder(testBotToken?: string, testChatId?: string, testFeUrl?: string, customMessageText?: string) {
    const token = (testBotToken !== undefined ? testBotToken : this.config.botToken || '').trim();
    const chatId = (testChatId !== undefined ? testChatId : this.config.chatId || '').trim();
    let feUrl = (testFeUrl !== undefined ? testFeUrl : this.config.feUrl || 'https://baocao4d.online').trim();

    if (!token) {
      throw new BadRequestException('Chưa nhập Telegram Bot Token!');
    }
    if (!chatId) {
      throw new BadRequestException('Chưa nhập Chat ID Nhóm Telegram!');
    }

    if (feUrl.includes('localhost') || feUrl.includes('127.0.0.1')) {
      throw new BadRequestException(
        'Telegram API quy định nút bấm Inline Button phải là đường dẫn công khai có tên miền / HTTPS (ví dụ: https://baocao6f.online). Vui lòng nhập link domain công khai thay vì http://localhost!',
      );
    }

    if (!feUrl.startsWith('http://') && !feUrl.startsWith('https://')) {
      feUrl = `https://${feUrl}`;
    }

    const messageText = customMessageText !== undefined && customMessageText.trim() !== ''
      ? customMessageText
      : (this.config.messageText || DEFAULT_TELEGRAM_MESSAGE);

    const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    const chatIds = chatId.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
    if (chatIds.length === 0) {
      throw new BadRequestException('Chưa nhập Chat ID Nhóm Telegram!');
    }

    const results = [];
    let lastError = '';

    for (const targetId of chatIds) {
      const payload = {
        chat_id: targetId,
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
          lastError = data.description || 'Lỗi gửi tin nhắn Telegram';
          this.logger.error(`Failed to send to chat ${targetId}: ${lastError}`);
        } else {
          results.push(data);
          this.logger.log(`Successfully sent Telegram message to chat ${targetId}`);
        }
      } catch (err) {
        lastError = err.message;
        this.logger.error(`Connection error sending to chat ${targetId}: ${err.message}`);
      }
    }

    if (results.length === 0) {
      if (lastError.includes('chat not found')) {
        throw new BadRequestException(
          'Lỗi "Chat not found": Không tìm thấy nhóm Telegram! Bạn đã THÊM BOT VÀO NHÓM và kiểm tra đúng Chat ID (dạng số âm như -100xxxxxxxxxx) chưa?',
        );
      }
      throw new BadRequestException(`Lỗi gửi Telegram: ${lastError || 'Không thể gửi đến nhóm nào'}`);
    }

    return { success: true, count: results.length, total: chatIds.length };
  }

  async sendUnreportedReminder(
    testBotToken?: string,
    testChatId?: string,
    testFeUrl?: string,
    customMessageText?: string,
  ) {
    const token = (testBotToken !== undefined ? testBotToken : this.config.botToken || '').trim();
    const chatId = (testChatId !== undefined ? testChatId : this.config.chatId || '').trim();
    let feUrl = (testFeUrl !== undefined ? testFeUrl : this.config.feUrl || 'https://baocao4d.online').trim();

    if (!token) {
      throw new BadRequestException('Chưa nhập Telegram Bot Token!');
    }
    if (!chatId) {
      throw new BadRequestException('Chưa nhập Chat ID Nhóm Telegram!');
    }

    if (feUrl.includes('localhost') || feUrl.includes('127.0.0.1')) {
      throw new BadRequestException(
        'Telegram API quy định nút bấm Inline Button phải là đường dẫn công khai có tên miền / HTTPS (ví dụ: https://baocao6f.online). Vui lòng nhập link domain công khai thay vì http://localhost!',
      );
    }

    if (!feUrl.startsWith('http://') && !feUrl.startsWith('https://')) {
      feUrl = `https://${feUrl}`;
    }

    const { missingEmployees, todayFormatted } = await this.getTodayUnreportedEmployees();

    let messageText = '';
    const template = customMessageText !== undefined && customMessageText.trim() !== ''
      ? customMessageText
      : (this.config.unreportedMessageText || DEFAULT_UNREPORTED_MESSAGE);

    if (missingEmployees.length > 0) {
      const listText = missingEmployees
        .map((emp, i) => `${i + 1}. <b>${emp.name}</b> (Mã: <code>${emp.code}</code>)`)
        .join('\n');

      if (template.includes('{LIST}')) {
        messageText = template
          .replace(/{LIST}/g, listText)
          .replace(/{DATE}/g, todayFormatted)
          .replace(/{COUNT}/g, String(missingEmployees.length));
      } else {
        messageText = `${template}\n\n<b>Danh sách chưa báo cáo:</b>\n${listText}`;
      }
    } else {
      messageText = `🎉 <b>TẤT CẢ NHÂN VIÊN ĐÃ BÁO CÁO ĐẦY ĐỦ NGÀY ${todayFormatted}</b> 🎉\n\nCảm ơn toàn thể anh em team đã nộp báo cáo số liệu đúng giờ! ❤️`;
    }

    const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    const chatIds = chatId.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
    if (chatIds.length === 0) {
      throw new BadRequestException('Chưa nhập Chat ID Nhóm Telegram!');
    }

    const results = [];
    let lastError = '';

    for (const targetId of chatIds) {
      const payload = {
        chat_id: targetId,
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
          lastError = data.description || 'Lỗi gửi tin nhắn Telegram';
          this.logger.error(`Failed to send unreported reminder to chat ${targetId}: ${lastError}`);
        } else {
          results.push(data);
          this.logger.log(`Successfully sent unreported reminder to chat ${targetId}`);
        }
      } catch (err) {
        lastError = err.message;
        this.logger.error(`Connection error sending unreported reminder to chat ${targetId}: ${err.message}`);
      }
    }

    if (results.length === 0) {
      if (lastError.includes('chat not found')) {
        throw new BadRequestException(
          'Lỗi "Chat not found": Không tìm thấy nhóm Telegram! Bạn đã THÊM BOT VÀO NHÓM và kiểm tra đúng Chat ID (dạng số âm như -100xxxxxxxxxx) chưa?',
        );
      }
      throw new BadRequestException(`Lỗi gửi Telegram: ${lastError || 'Không thể gửi đến nhóm nào'}`);
    }

    return { success: true, count: results.length, total: chatIds.length, missingCount: missingEmployees.length };
  }
}

