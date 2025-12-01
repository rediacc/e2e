import fs from 'fs';
import path from 'path';

// UUID v4 function
function v4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface TestUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  team?: string;
}

export interface TestMachine {
  name: string;
  ip: string;
  user: string;
  team: string;
  datastore?: string;
}

export interface TestRepository {
  name: string;
  machine: string;
  team: string;
  version?: string;
}

export interface TestData {
  users: TestUser[];
  machines: TestMachine[];
  repositories: TestRepository[];
  teams: string[];
}

export class TestDataManager {
  private dataDir: string;
  private testDataFile: string;

  constructor(dataDir: string = 'utils/data') {
    this.dataDir = dataDir;
    this.testDataFile = path.join(this.dataDir, 'test-data.json');
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (!fs.existsSync(this.testDataFile)) {
      this.initializeTestData();
    }
  }

  private initializeTestData(): void {
    // Get machine IPs from environment (CI) or use defaults (local)
    const vmWorkerIps = process.env.VM_WORKER_IPS;
    let machineIps: string[];

    if (vmWorkerIps) {
      // CI environment - parse comma-separated IPs
      machineIps = vmWorkerIps.split(',').map(ip => ip.trim()).filter(ip => ip);
      console.log(`Using VM_WORKER_IPS from environment: ${machineIps.join(', ')}`);
    } else {
      // Local development - use default IPs
      machineIps = ['192.168.111.11', '192.168.111.12'];
    }

    const defaultData: TestData = {
      users: [
        {
          email: 'admin@rediacc.io',
          password: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          team: 'Private Team'
        }
      ],
      machines: machineIps.map((ip, index) => ({
        name: `machine-${index + 1}`,
        ip: ip,
        user: process.env.VM_USR || 'runner',
        team: 'Private Team',
        datastore: '/mnt/datastore'
      })),
      repositories: [
        {
          name: 'test-repo',
          machine: 'machine-1',
          team: 'Private Team',
          version: '1.0.0'
        }
      ],
      teams: ['Private Team']
    };

    this.saveTestData(defaultData);
  }

  private loadTestData(): TestData {
    try {
      const data = fs.readFileSync(this.testDataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to load test data, using defaults');
      this.initializeTestData();
      return this.loadTestData();
    }
  }

  private saveTestData(data: TestData): void {
    fs.writeFileSync(this.testDataFile, JSON.stringify(data, null, 2));
  }

  getUser(role: string = 'user'): TestUser {
    const data = this.loadTestData();
    const user = data.users.find(u => u.role === role);
    
    if (!user) {
      throw new Error(`No user found with role: ${role}`);
    }

    return user;
  }

  getRandomUser(): TestUser {
    const data = this.loadTestData();
    const randomIndex = Math.floor(Math.random() * data.users.length);
    return data.users[randomIndex];
  }

  createTemporaryUser(role: string = 'user', team: string = 'Default'): TestUser {
    const timestamp = Date.now();
    return {
      email: `temp_user_${timestamp}@example.com`,
      password: 'temppassword123',
      firstName: 'Temp',
      lastName: `User${timestamp}`,
      role,
      team
    };
  }

  getMachine(name?: string): TestMachine {
    const data = this.loadTestData();
    
    if (name) {
      const machine = data.machines.find(m => m.name === name);
      if (!machine) {
        throw new Error(`No machine found with name: ${name}`);
      }
      return machine;
    }

    return data.machines[0];
  }

  createTemporaryMachine(team: string = 'Private Team'): TestMachine {
    const timestamp = Date.now();
    const data = this.loadTestData();
    // Use first machine's IP or fall back to default
    const machineIp = data.machines[0]?.ip || process.env.VM_WORKER_IPS?.split(',')[0]?.trim() || '192.168.111.11';
    const machineUser = data.machines[0]?.user || process.env.VM_USR || 'runner';

    return {
      name: `temp-machine-${timestamp}`,
      ip: machineIp,
      user: machineUser,
      team,
      datastore: '/mnt/datastore'
    };
  }

  getRepository(name?: string): TestRepository {
    const data = this.loadTestData();
    
    if (name) {
      const repo = data.repositories.find(r => r.name === name);
      if (!repo) {
        throw new Error(`No repository found with name: ${name}`);
      }
      return repo;
    }

    return data.repositories[0];
  }

  createTemporaryRepository(machine?: string, team: string = 'Default'): TestRepository {
    const timestamp = Date.now();
    const data = this.loadTestData();
    const targetMachine = machine || data.machines[0]?.name || 'default-machine';

    return {
      name: `temp-repo-${timestamp}`,
      machine: targetMachine,
      team,
      version: '1.0.0'
    };
  }

  getTeam(index: number = 0): string {
    const data = this.loadTestData();
    return data.teams[index] || 'Default';
  }

  getRandomTeam(): string {
    const data = this.loadTestData();
    const randomIndex = Math.floor(Math.random() * data.teams.length);
    return data.teams[randomIndex];
  }

  generateUniqueId(): string {
    return v4();
  }

  generateTestEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    return `${prefix}_${timestamp}@example.com`;
  }

  generateRandomString(length: number = 10): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  loadTestDataFromFile(filePath: string): any {
    try {
      const fullPath = path.resolve(filePath);
      const data = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load test data from ${filePath}: ${error}`);
    }
  }

  saveTestResults(testName: string, results: any): void {
    const resultsDir = path.join(this.dataDir, 'results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${testName}_${timestamp}.json`;
    const filePath = path.join(resultsDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    console.log(`💾 Test results saved: ${filePath}`);
  }

  addUser(user: TestUser): void {
    const data = this.loadTestData();
    data.users.push(user);
    this.saveTestData(data);
  }

  addMachine(machine: TestMachine): void {
    const data = this.loadTestData();
    data.machines.push(machine);
    this.saveTestData(data);
  }

  addRepository(repository: TestRepository): void {
    const data = this.loadTestData();
    data.repositories.push(repository);
    this.saveTestData(data);
  }

  cleanup(): void {
    console.log('🧹 Cleaning up test data...');
    
    const data = this.loadTestData();
    
    data.users = data.users.filter(user => !user.email.includes('temp_user_'));
    data.machines = data.machines.filter(machine => !machine.name.includes('temp-machine-'));
    data.repositories = data.repositories.filter(repo => !repo.name.includes('temp-repo-'));
    
    this.saveTestData(data);
  }

  getAllTestData(): TestData {
    return this.loadTestData();
  }
}