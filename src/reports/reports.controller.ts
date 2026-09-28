import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReportsService, CreateReportDto } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async submitReport(@Body() dto: CreateReportDto) {
    return await this.reportsService.submitReport(dto);
  }

  @Get()
  async getAllReports() {
    return await this.reportsService.getAllReports();
  }

  @Get('stats')
  async getStats(@Query('employeeCode') employeeCode?: string) {
    return await this.reportsService.getStats(employeeCode);
  }
}
