import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true })
  employeeCode: string;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ default: 0 })
  registeredCount: number;

  @Prop({ default: 0 })
  firstDepositCount: number;

  @Prop({ default: 0 })
  depositorsCount: number;

  @Prop({ default: 0 })
  totalDeposit: number;

  @Prop({ default: 0 })
  totalBet: number;

  @Prop({ default: () => new Date().toISOString() })
  createdAt: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
