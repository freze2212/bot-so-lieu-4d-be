import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService, Report } from '../database/database.service';

export interface CreateReportDto {
  employeeCode: string;
  date: string;
  registeredCount: number;
  firstDepositCount: number;
  totalDeposit: number;
  totalBet: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  submitReport(dto: CreateReportDto): Report {
    if (!dto.employeeCode) {
      throw new BadRequestException('Thiếu mã hậu đài nhân viên');
    }

    // Ensure numbers are non-negative
    const registeredCount = Math.max(0, Number(dto.registeredCount) || 0);
    const firstDepositCount = Math.max(0, Number(dto.firstDepositCount) || 0);
    const totalDeposit = Math.max(0, Number(dto.totalDeposit) || 0);
    const totalBet = Math.max(0, Number(dto.totalBet) || 0);

    const reportDate = dto.date || new Date().toISOString().split('T')[0];

    return this.db.addReport({
      employeeCode: dto.employeeCode,
      date: reportDate,
      registeredCount,
      firstDepositCount,
      totalDeposit,
      totalBet,
    });
  }

  getAllReports(): Report[] {
    return this.db.getReports().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getStats() {
    const reports = this.db.getReports();

    // Summary Totals
    let totalRegistered = 0;
    let totalFirstDeposit = 0;
    let grandTotalDeposit = 0;
    let grandTotalBet = 0;

    // Daily breakdown for line/bar charts
    const dailyMap: Record<string, {
      date: string;
      registered: number;
      firstDeposit: number;
      totalDeposit: number;
      totalBet: number;
    }> = {};

    // Employee breakdown
    const employeeMap: Record<string, {
      employeeCode: string;
      employeeName: string;
      registered: number;
      firstDeposit: number;
      totalDeposit: number;
      totalBet: number;
      reportCount: number;
    }> = {};

    for (const r of reports) {
      totalRegistered += r.registeredCount;
      totalFirstDeposit += r.firstDepositCount;
      grandTotalDeposit += r.totalDeposit;
      grandTotalBet += r.totalBet;

      // Daily
      if (!dailyMap[r.date]) {
        dailyMap[r.date] = {
          date: r.date,
          registered: 0,
          firstDeposit: 0,
          totalDeposit: 0,
          totalBet: 0,
        };
      }
      dailyMap[r.date].registered += r.registeredCount;
      dailyMap[r.date].firstDeposit += r.firstDepositCount;
      dailyMap[r.date].totalDeposit += r.totalDeposit;
      dailyMap[r.date].totalBet += r.totalBet;

      // Employee
      const empKey = r.employeeCode.toUpperCase();
      if (!employeeMap[empKey]) {
        employeeMap[empKey] = {
          employeeCode: empKey,
          employeeName: r.employeeName,
          registered: 0,
          firstDeposit: 0,
          totalDeposit: 0,
          totalBet: 0,
          reportCount: 0,
        };
      }
      employeeMap[empKey].registered += r.registeredCount;
      employeeMap[empKey].firstDeposit += r.firstDepositCount;
      employeeMap[empKey].totalDeposit += r.totalDeposit;
      employeeMap[empKey].totalBet += r.totalBet;
      employeeMap[empKey].reportCount += 1;
    }

    const dailyStats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const employeeStats = Object.values(employeeMap).sort((a, b) => b.totalDeposit - a.totalDeposit);

    return {
      summary: {
        totalRegistered,
        totalFirstDeposit,
        grandTotalDeposit,
        grandTotalBet,
        totalReports: reports.length,
      },
      dailyStats,
      employeeStats,
    };
  }
}
