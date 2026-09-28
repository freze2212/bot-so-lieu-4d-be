import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService, Report } from '../database/database.service';

export interface CreateReportDto {
  employeeCode: string;
  date: string;
  registeredCount: number;
  firstDepositCount: number;
  depositorsCount?: number;
  totalDeposit: number;
  totalBet: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async submitReport(dto: CreateReportDto): Promise<Report> {
    if (!dto.employeeCode) {
      throw new BadRequestException('Thiếu mã hậu đài nhân viên');
    }

    // Ensure numbers are non-negative
    const registeredCount = Math.max(0, Number(dto.registeredCount) || 0);
    const firstDepositCount = Math.max(0, Number(dto.firstDepositCount) || 0);
    const depositorsCount = Math.max(0, Number(dto.depositorsCount) || 0);
    const totalDeposit = Math.max(0, Number(dto.totalDeposit) || 0);
    const totalBet = Math.max(0, Number(dto.totalBet) || 0);

    const reportDate = dto.date || new Date().toISOString().split('T')[0];

    return await this.db.addReport({
      employeeCode: dto.employeeCode,
      date: reportDate,
      registeredCount,
      firstDepositCount,
      depositorsCount,
      totalDeposit,
      totalBet,
    });
  }

  private async getDeduplicatedReports(): Promise<Report[]> {
    const rawReports = await this.db.getReports();
    // Sort by createdAt ascending so later reports overwrite earlier ones for the same employee + date
    const sorted = [...rawReports].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const latestMap = new Map<string, Report>();
    for (const r of sorted) {
      if (!r.employeeCode || !r.date) continue;
      const key = `${r.employeeCode.trim().toUpperCase()}_${r.date}`;
      latestMap.set(key, r);
    }

    return Array.from(latestMap.values());
  }

  async getAllReports(): Promise<Report[]> {
    const reports = await this.getDeduplicatedReports();
    return reports.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getStats(employeeCode?: string) {
    let reports = await this.getDeduplicatedReports();
    let filterCode = '';

    if (employeeCode && employeeCode.trim() !== '') {
      filterCode = employeeCode.trim().toUpperCase();

      const employees = await this.db.getEmployees();
      const emp = employees.find(
        (e) => e.code.toUpperCase() === filterCode || e.name.toUpperCase() === filterCode || e.id === filterCode,
      );

      const targetCode = emp ? emp.code.toUpperCase() : filterCode;
      const targetName = emp ? emp.name.toUpperCase() : filterCode;

      reports = reports.filter(
        (r) =>
          (r.employeeCode && r.employeeCode.toUpperCase() === targetCode) ||
          (r.employeeCode && r.employeeCode.toUpperCase() === filterCode) ||
          (r.employeeName && r.employeeName.toUpperCase() === targetName) ||
          (r.employeeName && r.employeeName.toUpperCase() === filterCode),
      );
    }

    // Summary Totals
    let totalRegistered = 0;
    let totalFirstDeposit = 0;
    let totalDepositors = 0;
    let grandTotalDeposit = 0;
    let grandTotalBet = 0;

    // Daily breakdown for line/bar charts
    const dailyMap: Record<string, {
      date: string;
      employeeCode?: string;
      registered: number;
      firstDeposit: number;
      depositors: number;
      totalDeposit: number;
      totalBet: number;
      turnoverRatio: number;
    }> = {};

    // Employee breakdown
    const employeeMap: Record<string, {
      employeeCode: string;
      employeeName: string;
      registered: number;
      firstDeposit: number;
      depositors: number;
      totalDeposit: number;
      totalBet: number;
      turnoverRatio: number;
      reportCount: number;
    }> = {};

    for (const r of reports) {
      const depCount = Number(r.depositorsCount) || 0;
      totalRegistered += r.registeredCount;
      totalFirstDeposit += r.firstDepositCount;
      totalDepositors += depCount;
      grandTotalDeposit += r.totalDeposit;
      grandTotalBet += r.totalBet;

      // Daily
      if (!dailyMap[r.date]) {
        dailyMap[r.date] = {
          date: r.date,
          employeeCode: filterCode || r.employeeCode,
          registered: 0,
          firstDeposit: 0,
          depositors: 0,
          totalDeposit: 0,
          totalBet: 0,
          turnoverRatio: 0,
        };
      }
      dailyMap[r.date].registered += r.registeredCount;
      dailyMap[r.date].firstDeposit += r.firstDepositCount;
      dailyMap[r.date].depositors += depCount;
      dailyMap[r.date].totalDeposit += r.totalDeposit;
      dailyMap[r.date].totalBet += r.totalBet;
      dailyMap[r.date].turnoverRatio = dailyMap[r.date].totalDeposit > 0
        ? Math.round(dailyMap[r.date].totalBet / dailyMap[r.date].totalDeposit)
        : 0;

      // Employee
      const empKey = r.employeeCode.toUpperCase();
      if (!employeeMap[empKey]) {
        employeeMap[empKey] = {
          employeeCode: empKey,
          employeeName: r.employeeName,
          registered: 0,
          firstDeposit: 0,
          depositors: 0,
          totalDeposit: 0,
          totalBet: 0,
          turnoverRatio: 0,
          reportCount: 0,
        };
      }
      employeeMap[empKey].registered += r.registeredCount;
      employeeMap[empKey].firstDeposit += r.firstDepositCount;
      employeeMap[empKey].depositors += depCount;
      employeeMap[empKey].totalDeposit += r.totalDeposit;
      employeeMap[empKey].totalBet += r.totalBet;
      employeeMap[empKey].turnoverRatio = employeeMap[empKey].totalDeposit > 0
        ? Math.round(employeeMap[empKey].totalBet / employeeMap[empKey].totalDeposit)
        : 0;
      employeeMap[empKey].reportCount += 1;
    }

    const dailyStats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const employeeStats = Object.values(employeeMap).sort((a, b) => b.totalDeposit - a.totalDeposit);

    const overallTurnoverRatio = grandTotalDeposit > 0
      ? Math.round(grandTotalBet / grandTotalDeposit)
      : 0;

    return {
      summary: {
        totalRegistered,
        totalFirstDeposit,
        totalDepositors,
        grandTotalDeposit,
        grandTotalBet,
        turnoverRatio: overallTurnoverRatio,
        totalReports: reports.length,
      },
      dailyStats,
      employeeStats,
    };
  }
}
