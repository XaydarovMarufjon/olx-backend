import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Ad extends Document {
  @Prop({ required: true })
  keyword: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  price: string;

  @Prop()
  location: string;

  @Prop({ unique: true })  
  link: string;

  @Prop()
  image?: string;

  @Prop()
  scrapedAt: Date;
}

export const AdSchema = SchemaFactory.createForClass(Ad);