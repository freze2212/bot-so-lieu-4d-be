import { Module, Global, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { Report, ReportSchema } from './schemas/report.schema';
import { AdminConfig, AdminConfigSchema } from './schemas/admin.schema';

const logger = new Logger('DatabaseModule');

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bot-so-lieu-4d';
        const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        logger.log(`Connecting to MongoDB: ${maskedUri}`);
        return {
          uri,
          serverSelectionTimeoutMS: 10000,
        };
      },
    }),
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Report.name, schema: ReportSchema },
      { name: AdminConfig.name, schema: AdminConfigSchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, MongooseModule],
})
export class DatabaseModule {}
