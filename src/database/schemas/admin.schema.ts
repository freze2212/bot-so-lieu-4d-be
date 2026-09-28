import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminConfigDocument = AdminConfig & Document;

@Schema({ timestamps: true })
export class AdminConfig {
  @Prop({ required: true, default: 'admin' })
  username: string;

  @Prop({ required: true, default: 'admin123' })
  passwordHash: string;
}

export const AdminConfigSchema = SchemaFactory.createForClass(AdminConfig);
