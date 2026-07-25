import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface Employee {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Report {
  id: string;
  employeeCode: string;
  employeeName: string;
  date: string; // YYYY-MM-DD or DD/MM/YYYY
  registeredCount: number;
  firstDepositCount: number;
  totalDeposit: number;
  totalBet: number;
  createdAt: string;
}

export interface DbSchema {
  admin: { username: string; passwordHash: string };
  employees: Employee[];
  reports: Report[];
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private dbPath = path.join(process.cwd(), 'data', 'db.json');
  private data: DbSchema = {
    admin: { username: 'admin', passwordHash: 'admin123' },
    employees: [
      { id: '1', name: 'GHE BIFRONS', code: 'GG88F4D04', createdAt: new Date().toISOString() },
      { id: '2', name: 'NGUYEN VAN A', code: 'NVA001', createdAt: new Date().toISOString() },
      { id: '3', name: 'TRAN THI B', code: 'TTB002', createdAt: new Date().toISOString() }
    ],
    reports: [
      {
        id: 'rep-1',
        employeeCode: 'GG88F4D04',
        employeeName: 'GHE BIFRONS',
        date: '2026-07-24',
        registeredCount: 15,
        firstDepositCount: 8,
        totalDeposit: 15000000,
        totalBet: 45000000,
        createdAt: '2026-07-24T10:00:00.000Z'
      },
      {
        id: 'rep-2',
        employeeCode: 'NVA001',
        employeeName: 'NGUYEN VAN A',
        date: '2026-07-24',
        registeredCount: 22,
        firstDepositCount: 12,
        totalDeposit: 28000000,
        totalBet: 85000000,
        createdAt: '2026-07-24T11:30:00.000Z'
      },
      {
        id: 'rep-3',
        employeeCode: 'GG88F4D04',
        employeeName: 'GHE BIFRONS',
        date: '2026-07-25',
        registeredCount: 18,
        firstDepositCount: 10,
        totalDeposit: 21000000,
        totalBet: 62000000,
        createdAt: '2026-07-25T08:15:00.000Z'
      }
    ]
  };

  onModuleInit() {
    this.ensureDbFile();
  }

  private ensureDbFile() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading db.json, re-initializing with defaults', err);
        this.save();
      }
    } else {
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write db.json', err);
    }
  }

  getAdmin() {
    return this.data.admin;
  }

  getEmployees(): Employee[] {
    return this.data.employees;
  }

  getEmployeeByCode(code: string): Employee | undefined {
    return this.data.employees.find(e => e.code.toLowerCase() === code.toLowerCase());
  }

  addEmployee(name: string, code: string): Employee {
    const existing = this.getEmployeeByCode(code);
    if (existing) {
      return existing;
    }
    const newEmp: Employee = {
      id: Date.now().toString(),
      name: name.toUpperCase(),
      code: code.toUpperCase(),
      createdAt: new Date().toISOString()
    };
    this.data.employees.push(newEmp);
    this.save();
    return newEmp;
  }

  deleteEmployee(idOrCode: string): boolean {
    const targetEmp = this.data.employees.find(
      e => e.id === idOrCode || e.code.toLowerCase() === idOrCode.toLowerCase()
    );

    const empCode = targetEmp ? targetEmp.code.toUpperCase() : idOrCode.toUpperCase();

    const empBefore = this.data.employees.length;
    const repBefore = this.data.reports.length;

    // Remove employee entry
    this.data.employees = this.data.employees.filter(
      e => e.id !== idOrCode && e.code.toLowerCase() !== idOrCode.toLowerCase()
    );

    // Remove all associated reports for this employee code
    this.data.reports = this.data.reports.filter(
      r => r.employeeCode.toUpperCase() !== empCode
    );

    const changed = this.data.employees.length !== empBefore || this.data.reports.length !== repBefore;
    if (changed) {
      this.save();
      return true;
    }
    return false;
  }

  getReports(): Report[] {
    return this.data.reports;
  }

  addReport(reportData: {
    employeeCode: string;
    date: string;
    registeredCount: number;
    firstDepositCount: number;
    totalDeposit: number;
    totalBet: number;
  }): Report {
    const emp = this.getEmployeeByCode(reportData.employeeCode);
    const newReport: Report = {
      id: `rep-${Date.now()}`,
      employeeCode: reportData.employeeCode.toUpperCase(),
      employeeName: emp ? emp.name : 'Unknown',
      date: reportData.date,
      registeredCount: Number(reportData.registeredCount) || 0,
      firstDepositCount: Number(reportData.firstDepositCount) || 0,
      totalDeposit: Number(reportData.totalDeposit) || 0,
      totalBet: Number(reportData.totalBet) || 0,
      createdAt: new Date().toISOString()
    };
    this.data.reports.push(newReport);
    this.save();
    return newReport;
  }
}
