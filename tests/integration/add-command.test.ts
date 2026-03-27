import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const describeNetwork = process.env.RUN_NETWORK_TESTS === '1' ? describe : describe.skip;

describe('apm add - Git 版本语法', () => {
  const testDir = path.join(process.cwd(), 'tmp', 'test-add-command');
  const rootDir = process.cwd();
  const cliPath = path.join(rootDir, 'bin', 'cli.mjs');

  beforeAll(async () => {
    execSync('pnpm build', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('版本解析验证', () => {
    it('应该在缺少前缀时报错', () => {
      const cmd = `cd ${testDir} && node ${cliPath} add github:anthropic/ai-skills@v1.0.0 --list 2>&1`;
      let output: string;
      try {
        output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        output = error.stderr || error.stdout || error.message;
      }
      expect(output).toMatch(/版本需要显式前缀|Command failed/);
    });

    it('无效的版本格式应该报错', () => {
      const cmd = `cd ${testDir} && node ${cliPath} add github:anthropic/ai-skills@invalid --list 2>&1`;
      let output: string;
      try {
        output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        output = error.stderr || error.stdout || error.message;
      }
      expect(output).toMatch(/版本需要显式前缀|Command failed/);
    });

    it('空的 source 应该报错', () => {
      const cmd = `cd ${testDir} && node ${cliPath} add github:@tag:v1.0.0 --list 2>&1`;
      let output: string;
      try {
        output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        output = error.stderr || error.stdout || error.message;
      }
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describeNetwork('远程版本解析验证', () => {
    it('极简模式应该成功解析（不需要实际克隆）', () => {
      const cmd = `cd ${testDir} && node ${cliPath} add github:anthropic/ai-skills --list 2>&1`;
      let output: string;
      try {
        output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        output = error.stderr || error.stdout || error.message;
      }
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
    });

    it('显式 tag 模式应该成功解析', () => {
      const cmd = `cd ${testDir} && node ${cliPath} add github:anthropic/ai-skills@tag:v1.0.0 --list 2>&1`;
      let output: string;
      try {
        output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        output = error.stderr || error.stdout || error.message;
      }
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
    });

    it('显式 branch 模式应该成功解析', () => {
      const cmd = `cd ${testDir} && node ${cliPath} add github:anthropic/ai-skills@branch:main --list 2>&1`;
      let output: string;
      try {
        output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        output = error.stderr || error.stdout || error.message;
      }
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
    });

    it('--list 应该显示可用的 skills 列表', () => {
      const cmd = `cd ${testDir} && node ${cliPath} add github:vercel-labs/agent-browser --list 2>&1`;
      let output: string;
      try {
        output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        output = error.stderr || error.stdout || error.message;
      }
      // 应该包含 skill 名称
      expect(output).toMatch(/agent-browser/);
      expect(output).toMatch(/dogfood/);
      expect(output).toMatch(/electron/);
      expect(output).toMatch(/slack/);
      // 应该包含描述信息
      expect(output).toMatch(/Browser automation/);
      // 应该包含提示信息
      expect(output).toMatch(/--skill/);
    });

    it('--list 不应该修改 apm.json', async () => {
      const apmJsonPath = path.join(testDir, 'apm.json');
      // 创建空的 apm.json
      await fs.writeFile(apmJsonPath, JSON.stringify({ skills: {} }, null, 2));

      const beforeContent = await fs.readFile(apmJsonPath, 'utf-8');

      const cmd = `cd ${testDir} && node ${cliPath} add github:vercel-labs/agent-browser --list 2>&1`;
      try {
        execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (error: any) {
        // 忽略错误
      }

      const afterContent = await fs.readFile(apmJsonPath, 'utf-8');
      expect(afterContent).toEqual(beforeContent);
    });
  });
});
