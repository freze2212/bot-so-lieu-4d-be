import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { ReportsModule } from './reports/reports.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    EmployeesModule,
    ReportsModule,
    TelegramModule,
  ],
})
export class AppModule {}
