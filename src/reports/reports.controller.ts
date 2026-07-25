import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReportsService, CreateReportDto } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  submitReport(@Body() dto: CreateReportDto) {
    return this.reportsService.submitReport(dto);
  }

  @Get()
  getAllReports() {
    return this.reportsService.getAllReports();
  }

  @Get('stats')
  getStats() {
    return this.reportsService.getStats();
  }
}
