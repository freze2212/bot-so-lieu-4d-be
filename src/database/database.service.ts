import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Employee as EmployeeEntity, EmployeeDocument } from './schemas/employee.schema';
import { Report as ReportEntity, ReportDocument } from './schemas/report.schema';
import { AdminConfig, AdminConfigDocument } from './schemas/admin.schema';

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
  date: string; // YYYY-MM-DD
  registeredCount: number;
  firstDepositCount: number;
  depositorsCount?: number;
  totalDeposit: number;
  totalBet: number;
  createdAt: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectModel(EmployeeEntity.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(ReportEntity.name) private readonly reportModel: Model<ReportDocument>,
    @InjectModel(AdminConfig.name) private readonly adminModel: Model<AdminConfigDocument>,
  ) {}

  async onModuleInit() {
    await this.seedInitialData();
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private async seedInitialData() {
    try {
      const adminCount = await this.adminModel.countDocuments();
      if (adminCount === 0) {
        const hashedDefault = this.hashPassword('admin123');
        await this.adminModel.create({ username: 'admin', passwordHash: hashedDefault });
        this.logger.log('Seeded default admin account into MongoDB with crypto hashed password');
      }

      const empCount = await this.employeeModel.countDocuments();
      if (empCount === 0) {
        await this.employeeModel.insertMany([
          { name: 'NGUYEN VAN A', code: 'NVA001', createdAt: new Date().toISOString() },
          { name: 'TRAN THI B', code: 'TTB002', createdAt: new Date().toISOString() },
        ]);
        this.logger.log('Seeded sample employees into MongoDB');
      }
    } catch (err) {
      this.logger.warn('Could not seed initial MongoDB data (will fallback to in-memory defaults if DB is unavailable):', err.message);
    }
  }

  async getAdmin(): Promise<{ username: string; passwordHash: string }> {
    try {
      const admin = await this.adminModel.findOne().exec();
      if (admin && admin.username && admin.passwordHash) {
        return { username: admin.username, passwordHash: admin.passwordHash };
      }
    } catch (err) {
      this.logger.error('Error fetching admin from MongoDB, using fallback (admin / admin123):', err.message);
    }
    return { username: 'admin', passwordHash: 'admin123' };
  }

  async verifyPassword(inputPass: string, storedHashOrPlain: string): Promise<boolean> {
    if (!inputPass || !storedHashOrPlain) return false;
    const cleanInput = inputPass.trim();
    const cleanStored = storedHashOrPlain.trim();

    if (cleanStored.includes(':')) {
      const parts = cleanStored.split(':');
      if (parts.length === 2) {
        const [salt, originalHash] = parts;
        const hash = crypto.pbkdf2Sync(cleanInput, salt, 1000, 64, 'sha512').toString('hex');
        return hash === originalHash;
      }
    }

    if (cleanStored.startsWith('$2a$') || cleanStored.startsWith('$2b$')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bcrypt = require('bcryptjs');
        return bcrypt.compareSync(cleanInput, cleanStored);
      } catch (e) {
        // fallback if bcryptjs not installed
      }
    }

    // Fallback for legacy plaintext passwords
    return cleanInput === cleanStored;
  }

  async updateAdminPassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const currentAdmin = await this.getAdmin();
      const isOldValid = await this.verifyPassword(oldPassword || '', currentAdmin.passwordHash || 'admin123');

      if (!isOldValid) {
        this.logger.warn('Admin password change rejected: old password mismatch');
        return { success: false, error: 'Mật khẩu hiện tại không chính xác' };
      }

      const newHashed = this.hashPassword(newPassword.trim());
      await this.adminModel.findOneAndUpdate(
        { username: 'admin' },
        { passwordHash: newHashed },
        { upsert: true, new: true },
      ).exec();

      this.logger.log('Admin password updated in MongoDB successfully with crypto hash');
      return { success: true };
    } catch (err) {
      this.logger.error('Error updating admin password in MongoDB:', err.message);
      return { success: false, error: `Lỗi ghi MongoDB trên Server: ${err.message}` };
    }
  }

  async getEmployees(): Promise<Employee[]> {
    try {
      const docs = await this.employeeModel.find().exec();
      if (docs && docs.length > 0) {
        return docs.map((doc) => ({
          id: doc._id.toString(),
          name: doc.name,
          code: doc.code,
          createdAt: doc.createdAt || new Date().toISOString(),
        }));
      }
    } catch (err) {
      this.logger.error('Error fetching employees from MongoDB:', err.message);
    }
    return [
      { id: '1', name: 'NGUYEN VAN A', code: 'NVA001', createdAt: new Date().toISOString() },
      { id: '2', name: 'TRAN THI B', code: 'TTB002', createdAt: new Date().toISOString() },
    ];
  }

  async getEmployeeByCode(code: string): Promise<Employee | undefined> {
    if (!code) return undefined;
    const safeCode = code.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const doc = await this.employeeModel
        .findOne({ code: { $regex: new RegExp(`^${safeCode}$`, 'i') } })
        .exec();
      if (doc) {
        return {
          id: doc._id.toString(),
          name: doc.name,
          code: doc.code,
          createdAt: doc.createdAt || new Date().toISOString(),
        };
      }
    } catch (err) {
      this.logger.error('Error fetching employee by code from MongoDB:', err.message);
    }
    const employees = await this.getEmployees();
    return employees.find((e) => e.code.toLowerCase() === code.trim().toLowerCase());
  }

  async addEmployee(name: string, code: string): Promise<Employee> {
    const existing = await this.getEmployeeByCode(code);
    if (existing) {
      return existing;
    }
    try {
      const created = await this.employeeModel.create({
        name: name.toUpperCase(),
        code: code.toUpperCase(),
        createdAt: new Date().toISOString(),
      });
      return {
        id: created._id.toString(),
        name: created.name,
        code: created.code,
        createdAt: created.createdAt,
      };
    } catch (err) {
      this.logger.error('Error creating employee in MongoDB:', err.message);
      return {
        id: Date.now().toString(),
        name: name.toUpperCase(),
        code: code.toUpperCase(),
        createdAt: new Date().toISOString(),
      };
    }
  }

  async deleteEmployee(idOrCode: string): Promise<boolean> {
    if (!idOrCode) return false;
    const cleanInput = idOrCode.trim();

    try {
      let empDoc: EmployeeDocument | null = null;

      // 1. Check if idOrCode is a valid MongoDB ObjectId
      if (Types.ObjectId.isValid(cleanInput)) {
        empDoc = await this.employeeModel.findById(cleanInput).exec();
      }

      // 2. If not found by ObjectId, search by code
      if (!empDoc) {
        const safeCode = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        empDoc = await this.employeeModel.findOne({
          code: { $regex: new RegExp(`^${safeCode}$`, 'i') },
        }).exec();
      }

      let deletedEmp = false;
      let targetCode = cleanInput;

      if (empDoc) {
        targetCode = empDoc.code;
        const res = await this.employeeModel.deleteOne({ _id: empDoc._id }).exec();
        deletedEmp = (res.deletedCount || 0) > 0;
      } else {
        const safeCode = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const res = await this.employeeModel.deleteOne({
          code: { $regex: new RegExp(`^${safeCode}$`, 'i') },
        }).exec();
        deletedEmp = (res.deletedCount || 0) > 0;
      }

      // 3. Delete all reports belonging to target employee code
      const safeTargetCode = targetCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const resReports = await this.reportModel.deleteMany({
        employeeCode: { $regex: new RegExp(`^${safeTargetCode}$`, 'i') },
      }).exec();

      this.logger.log(`Deleted employee "${targetCode}" (empDeleted=${deletedEmp}, reportsDeleted=${resReports.deletedCount || 0})`);
      return deletedEmp || (resReports.deletedCount || 0) > 0;
    } catch (err) {
      this.logger.error('Error deleting employee from MongoDB:', err.message);
      return false;
    }
  }

  async getReports(): Promise<Report[]> {
    try {
      const docs = await this.reportModel.find().exec();
      return docs.map((doc) => ({
        id: doc._id.toString(),
        employeeCode: doc.employeeCode,
        employeeName: doc.employeeName,
        date: doc.date,
        registeredCount: doc.registeredCount || 0,
        firstDepositCount: doc.firstDepositCount || 0,
        depositorsCount: doc.depositorsCount || 0,
        totalDeposit: doc.totalDeposit || 0,
        totalBet: doc.totalBet || 0,
        createdAt: doc.createdAt || new Date().toISOString(),
      }));
    } catch (err) {
      this.logger.error('Error fetching reports from MongoDB:', err.message);
      return [];
    }
  }

  async addReport(reportData: {
    employeeCode: string;
    date: string;
    registeredCount: number;
    firstDepositCount: number;
    depositorsCount?: number;
    totalDeposit: number;
    totalBet: number;
  }): Promise<Report> {
    const empCode = reportData.employeeCode.toUpperCase();
    const emp = await this.getEmployeeByCode(reportData.employeeCode);
    const empName = emp ? emp.name : 'Unknown';

    try {
      const existing = await this.reportModel.findOne({
        employeeCode: { $regex: new RegExp(`^${empCode}$`, 'i') },
        date: reportData.date,
      }).exec();

      if (existing) {
        existing.employeeName = empName;
        existing.registeredCount = Number(reportData.registeredCount) || 0;
        existing.firstDepositCount = Number(reportData.firstDepositCount) || 0;
        existing.depositorsCount = Number(reportData.depositorsCount) || 0;
        existing.totalDeposit = Number(reportData.totalDeposit) || 0;
        existing.totalBet = Number(reportData.totalBet) || 0;
        existing.createdAt = new Date().toISOString();
        await existing.save();

        return {
          id: existing._id.toString(),
          employeeCode: existing.employeeCode,
          employeeName: existing.employeeName,
          date: existing.date,
          registeredCount: existing.registeredCount,
          firstDepositCount: existing.firstDepositCount,
          depositorsCount: existing.depositorsCount,
          totalDeposit: existing.totalDeposit,
          totalBet: existing.totalBet,
          createdAt: existing.createdAt,
        };
      }

      const created = await this.reportModel.create({
        employeeCode: empCode,
        employeeName: empName,
        date: reportData.date,
        registeredCount: Number(reportData.registeredCount) || 0,
        firstDepositCount: Number(reportData.firstDepositCount) || 0,
        depositorsCount: Number(reportData.depositorsCount) || 0,
        totalDeposit: Number(reportData.totalDeposit) || 0,
        totalBet: Number(reportData.totalBet) || 0,
        createdAt: new Date().toISOString(),
      });

      return {
        id: created._id.toString(),
        employeeCode: created.employeeCode,
        employeeName: created.employeeName,
        date: created.date,
        registeredCount: created.registeredCount,
        firstDepositCount: created.firstDepositCount,
        depositorsCount: created.depositorsCount,
        totalDeposit: created.totalDeposit,
        totalBet: created.totalBet,
        createdAt: created.createdAt,
      };
    } catch (err) {
      this.logger.error('Error adding report to MongoDB:', err.message);
      return {
        id: `rep-${Date.now()}`,
        employeeCode: empCode,
        employeeName: empName,
        date: reportData.date,
        registeredCount: Number(reportData.registeredCount) || 0,
        firstDepositCount: Number(reportData.firstDepositCount) || 0,
        depositorsCount: Number(reportData.depositorsCount) || 0,
        totalDeposit: Number(reportData.totalDeposit) || 0,
        totalBet: Number(reportData.totalBet) || 0,
        createdAt: new Date().toISOString(),
      };
    }
  }
}
