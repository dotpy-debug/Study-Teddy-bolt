#!/usr/bin/env bun

/**
 * Comprehensive Security Scanner for StudyTeddy
 * Automated security scanning and vulnerability assessment
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

class SecurityScanner {
  constructor() {
    this.projectRoot = process.cwd();
    this.reportsDir = join(this.projectRoot, 'security-reports');
    this.configDir = join(this.projectRoot, '.security');

    // Ensure directories exist
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }

    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }

    this.scanResults = {
      timestamp: new Date().toISOString(),
      scans: {},
      summary: {
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  /**
   * Log messages with timestamp
   */
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  /**
   * Execute command safely
   */
  execCommand(command, options = {}) {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options
      });
      return { success: true, output: result, error: null };
    } catch (error) {
      return { success: false, output: null, error: error.message };
    }
  }

  /**
   * Check if a tool is installed
   */
  isToolInstalled(command) {
    const result = this.execCommand(`which ${command} || where ${command}`);
    return result.success;
  }

  /**
   * Install required security tools
   */
  installTools() {
    this.log('Installing security tools...');

    const tools = [
      { name: 'gitleaks', install: 'curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin' },
      { name: 'semgrep', install: 'pip install semgrep' },
      { name: 'bandit', install: 'pip install bandit' },
      { name: 'safety', install: 'pip install safety' },
      { name: 'trivy', install: 'curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin' },
      { name: 'syft', install: 'curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin' },
      { name: 'grype', install: 'curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin' }
    ];

    for (const tool of tools) {
      if (!this.isToolInstalled(tool.name)) {
        this.log(`Installing ${tool.name}...`);
        const result = this.execCommand(tool.install);
        if (!result.success) {
          this.log(`Failed to install ${tool.name}: ${result.error}`, 'WARN');
        }
      } else {
        this.log(`${tool.name} is already installed`);
      }
    }
  }

  /**
   * Scan for secrets in codebase
   */
  async scanSecrets() {
    this.log('Starting secret scanning...');

    const scanName = 'secrets';
    this.scanResults.scans[scanName] = {
      name: 'Secret Scanning',
      status: 'running',
      findings: [],
      errors: []
    };

    try {
      // Gitleaks scan
      this.log('Running Gitleaks...');
      const gitleaksConfig = this.createGitleaksConfig();
      const gitleaksResult = this.execCommand(`gitleaks detect --source . --config ${gitleaksConfig} --report-format json --report-path ${join(this.reportsDir, 'gitleaks-report.json')}`);

      if (gitleaksResult.success) {
        const reportPath = join(this.reportsDir, 'gitleaks-report.json');
        if (existsSync(reportPath)) {
          const report = JSON.parse(readFileSync(reportPath, 'utf8'));
          this.scanResults.scans[scanName].findings.push(...this.parseGitleaksReport(report));
        }
      } else {
        this.scanResults.scans[scanName].errors.push(`Gitleaks failed: ${gitleaksResult.error}`);
      }

      // TruffleHog scan (alternative secret scanner)
      this.log('Running TruffleHog...');
      const truffleResult = this.execCommand('trufflehog filesystem . --json');
      if (truffleResult.success && truffleResult.output) {
        const findings = this.parseTruffleHogOutput(truffleResult.output);
        this.scanResults.scans[scanName].findings.push(...findings);
      }

      // detect-secrets scan
      this.log('Running detect-secrets...');
      const detectSecretsResult = this.execCommand('detect-secrets scan --all-files');
      if (detectSecretsResult.success) {
        this.log('detect-secrets scan completed');
      }

      this.scanResults.scans[scanName].status = 'completed';
      this.log(`Secret scanning completed. Found ${this.scanResults.scans[scanName].findings.length} potential secrets.`);

    } catch (error) {
      this.scanResults.scans[scanName].status = 'failed';
      this.scanResults.scans[scanName].errors.push(error.message);
      this.log(`Secret scanning failed: ${error.message}`, 'ERROR');
    }

    return this.scanResults.scans[scanName];
  }

  /**
   * Scan for dependency vulnerabilities
   */
  async scanDependencies() {
    this.log('Starting dependency vulnerability scanning...');

    const scanName = 'dependencies';
    this.scanResults.scans[scanName] = {
      name: 'Dependency Vulnerability Scanning',
      status: 'running',
      findings: [],
      errors: []
    };

    try {
      // Bun audit
      this.log('Running Bun audit...');
      const bunResult = this.execCommand('bun audit --json');
      if (bunResult.success && bunResult.output) {
        const audit = JSON.parse(bunResult.output);
        this.scanResults.scans[scanName].findings.push(...this.parseBunAudit(audit));
      }

      // npm audit (fallback)
      this.log('Running npm audit...');
      const npmResult = this.execCommand('npm audit --json');
      if (npmResult.success && npmResult.output) {
        const audit = JSON.parse(npmResult.output);
        this.scanResults.scans[scanName].findings.push(...this.parseNpmAudit(audit));
      }

      // Safety check for Python dependencies (if any)
      if (existsSync('requirements.txt') || existsSync('pyproject.toml')) {
        this.log('Running Safety check for Python dependencies...');
        const safetyResult = this.execCommand('safety check --json');
        if (safetyResult.success && safetyResult.output) {
          const findings = this.parseSafetyReport(JSON.parse(safetyResult.output));
          this.scanResults.scans[scanName].findings.push(...findings);
        }
      }

      // OSV Scanner
      this.log('Running OSV Scanner...');
      const osvResult = this.execCommand('osv-scanner -r .');
      if (osvResult.success) {
        this.log('OSV Scanner completed');
      }

      this.scanResults.scans[scanName].status = 'completed';
      this.log(`Dependency scanning completed. Found ${this.scanResults.scans[scanName].findings.length} vulnerabilities.`);

    } catch (error) {
      this.scanResults.scans[scanName].status = 'failed';
      this.scanResults.scans[scanName].errors.push(error.message);
      this.log(`Dependency scanning failed: ${error.message}`, 'ERROR');
    }

    return this.scanResults.scans[scanName];
  }

  /**
   * Static Application Security Testing (SAST)
   */
  async scanSAST() {
    this.log('Starting Static Application Security Testing (SAST)...');

    const scanName = 'sast';
    this.scanResults.scans[scanName] = {
      name: 'Static Application Security Testing',
      status: 'running',
      findings: [],
      errors: []
    };

    try {
      // Semgrep scan
      this.log('Running Semgrep...');
      const semgrepRules = [
        'p/security-audit',
        'p/secrets',
        'p/javascript',
        'p/typescript',
        'p/react',
        'p/nodejs',
        'p/owasp-top-ten'
      ];

      const semgrepResult = this.execCommand(`semgrep --config=${semgrepRules.join(',')} --json --output=${join(this.reportsDir, 'semgrep-report.json')} .`);

      if (semgrepResult.success) {
        const reportPath = join(this.reportsDir, 'semgrep-report.json');
        if (existsSync(reportPath)) {
          const report = JSON.parse(readFileSync(reportPath, 'utf8'));
          this.scanResults.scans[scanName].findings.push(...this.parseSemgrepReport(report));
        }
      }

      // ESLint security rules
      this.log('Running ESLint security scan...');
      const eslintResult = this.execCommand('bunx eslint . --ext .js,.jsx,.ts,.tsx --format json --output-file ' + join(this.reportsDir, 'eslint-security.json'));
      if (eslintResult.success) {
        const reportPath = join(this.reportsDir, 'eslint-security.json');
        if (existsSync(reportPath)) {
          const report = JSON.parse(readFileSync(reportPath, 'utf8'));
          this.scanResults.scans[scanName].findings.push(...this.parseESLintReport(report));
        }
      }

      // CodeQL analysis (if available)
      this.log('Checking for CodeQL analysis...');
      if (this.isToolInstalled('codeql')) {
        const codeqlResult = this.execCommand('codeql database create --language=javascript --source-root=. codeql-db');
        if (codeqlResult.success) {
          this.execCommand('codeql database analyze codeql-db --format=sarif-latest --output=codeql-results.sarif');
        }
      }

      this.scanResults.scans[scanName].status = 'completed';
      this.log(`SAST scanning completed. Found ${this.scanResults.scans[scanName].findings.length} potential issues.`);

    } catch (error) {
      this.scanResults.scans[scanName].status = 'failed';
      this.scanResults.scans[scanName].errors.push(error.message);
      this.log(`SAST scanning failed: ${error.message}`, 'ERROR');
    }

    return this.scanResults.scans[scanName];
  }

  /**
   * Container security scanning
   */
  async scanContainers() {
    this.log('Starting container security scanning...');

    const scanName = 'containers';
    this.scanResults.scans[scanName] = {
      name: 'Container Security Scanning',
      status: 'running',
      findings: [],
      errors: []
    };

    try {
      const dockerfiles = ['apps/backend/Dockerfile', 'apps/frontend/Dockerfile'];

      for (const dockerfile of dockerfiles) {
        if (existsSync(dockerfile)) {
          this.log(`Scanning ${dockerfile}...`);

          // Build image for scanning
          const imageName = `studyteddy-security-scan:${Date.now()}`;
          const buildResult = this.execCommand(`docker build -f ${dockerfile} -t ${imageName} ${dirname(dockerfile)}`);

          if (buildResult.success) {
            // Trivy scan
            const trivyResult = this.execCommand(`trivy image --format json --output ${join(this.reportsDir, `trivy-${basename(dockerfile, '.Dockerfile')}.json`)} ${imageName}`);
            if (trivyResult.success) {
              const reportPath = join(this.reportsDir, `trivy-${basename(dockerfile, '.Dockerfile')}.json`);
              if (existsSync(reportPath)) {
                const report = JSON.parse(readFileSync(reportPath, 'utf8'));
                this.scanResults.scans[scanName].findings.push(...this.parseTrivyReport(report));
              }
            }

            // Grype scan
            const grypeResult = this.execCommand(`grype ${imageName} -o json`);
            if (grypeResult.success && grypeResult.output) {
              const findings = this.parseGrypeReport(JSON.parse(grypeResult.output));
              this.scanResults.scans[scanName].findings.push(...findings);
            }

            // Clean up image
            this.execCommand(`docker rmi ${imageName}`);
          }
        }
      }

      this.scanResults.scans[scanName].status = 'completed';
      this.log(`Container scanning completed. Found ${this.scanResults.scans[scanName].findings.length} vulnerabilities.`);

    } catch (error) {
      this.scanResults.scans[scanName].status = 'failed';
      this.scanResults.scans[scanName].errors.push(error.message);
      this.log(`Container scanning failed: ${error.message}`, 'ERROR');
    }

    return this.scanResults.scans[scanName];
  }

  /**
   * Infrastructure as Code security scanning
   */
  async scanInfrastructure() {
    this.log('Starting Infrastructure as Code security scanning...');

    const scanName = 'infrastructure';
    this.scanResults.scans[scanName] = {
      name: 'Infrastructure Security Scanning',
      status: 'running',
      findings: [],
      errors: []
    };

    try {
      // Checkov scan
      if (this.isToolInstalled('checkov')) {
        this.log('Running Checkov...');
        const checkovResult = this.execCommand(`checkov -d . --framework terraform,kubernetes,dockerfile --output json`);
        if (checkovResult.success && checkovResult.output) {
          const findings = this.parseCheckovReport(JSON.parse(checkovResult.output));
          this.scanResults.scans[scanName].findings.push(...findings);
        }
      }

      // Terrascan
      if (this.isToolInstalled('terrascan')) {
        this.log('Running Terrascan...');
        const terrascanResult = this.execCommand('terrascan scan -t terraform -d infrastructure/terraform');
        if (terrascanResult.success) {
          this.log('Terrascan completed');
        }
      }

      // kube-score for Kubernetes manifests
      if (existsSync('k8s') && this.isToolInstalled('kube-score')) {
        this.log('Running kube-score...');
        const kubeScoreResult = this.execCommand('kube-score score k8s/**/*.yaml --output-format json');
        if (kubeScoreResult.success && kubeScoreResult.output) {
          const findings = this.parseKubeScoreReport(JSON.parse(kubeScoreResult.output));
          this.scanResults.scans[scanName].findings.push(...findings);
        }
      }

      this.scanResults.scans[scanName].status = 'completed';
      this.log(`Infrastructure scanning completed. Found ${this.scanResults.scans[scanName].findings.length} issues.`);

    } catch (error) {
      this.scanResults.scans[scanName].status = 'failed';
      this.scanResults.scans[scanName].errors.push(error.message);
      this.log(`Infrastructure scanning failed: ${error.message}`, 'ERROR');
    }

    return this.scanResults.scans[scanName];
  }

  /**
   * License compliance scanning
   */
  async scanLicenses() {
    this.log('Starting license compliance scanning...');

    const scanName = 'licenses';
    this.scanResults.scans[scanName] = {
      name: 'License Compliance Scanning',
      status: 'running',
      findings: [],
      errors: []
    };

    try {
      // License checker
      const licenseResult = this.execCommand('bunx license-checker --json');
      if (licenseResult.success && licenseResult.output) {
        const licenses = JSON.parse(licenseResult.output);
        const findings = this.parseLicenseReport(licenses);
        this.scanResults.scans[scanName].findings.push(...findings);
      }

      // Check for allowed licenses
      const allowedLicenses = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD'];
      const complianceResult = this.execCommand(`bunx license-checker --onlyAllow "${allowedLicenses.join(';')}" --excludePrivatePackages`);

      if (!complianceResult.success) {
        this.scanResults.scans[scanName].findings.push({
          type: 'license_violation',
          severity: 'medium',
          message: 'Non-compliant licenses detected',
          details: complianceResult.error
        });
      }

      this.scanResults.scans[scanName].status = 'completed';
      this.log(`License scanning completed. Found ${this.scanResults.scans[scanName].findings.length} issues.`);

    } catch (error) {
      this.scanResults.scans[scanName].status = 'failed';
      this.scanResults.scans[scanName].errors.push(error.message);
      this.log(`License scanning failed: ${error.message}`, 'ERROR');
    }

    return this.scanResults.scans[scanName];
  }

  /**
   * Create Gitleaks configuration
   */
  createGitleaksConfig() {
    const configPath = join(this.configDir, 'gitleaks.toml');

    const config = `
[extend]
useDefault = true

[[rules]]
description = "StudyTeddy API Keys"
regex = '''(?i)(studyteddy_api_key|st_api_key)['"\s]*[:=]\s*['"]?([a-zA-Z0-9]{32,})'''
tags = ["api-key", "studyteddy"]

[[rules]]
description = "Database Connection Strings"
regex = '''(?i)(database_url|db_url)['"\s]*[:=]\s*['"]?(postgresql://|mysql://|mongodb://)([^'"\s]+)'''
tags = ["database", "connection-string"]

[[rules]]
description = "JWT Secrets"
regex = '''(?i)(jwt_secret|jwt_key)['"\s]*[:=]\s*['"]?([a-zA-Z0-9+/]{32,})'''
tags = ["jwt", "secret"]

[allowlist]
description = "Allowlist for test files"
files = [
  ".*test.*",
  ".*spec.*",
  ".*/tests/.*",
  ".*/test/.*"
]
`;

    writeFileSync(configPath, config);
    return configPath;
  }

  /**
   * Parse Gitleaks report
   */
  parseGitleaksReport(report) {
    if (!Array.isArray(report)) return [];

    return report.map(finding => ({
      type: 'secret',
      severity: 'high',
      rule: finding.RuleID,
      message: finding.Description,
      file: finding.File,
      line: finding.StartLine,
      secret: finding.Secret.substring(0, 10) + '...',
      details: {
        commit: finding.Commit,
        author: finding.Author,
        email: finding.Email,
        date: finding.Date
      }
    }));
  }

  /**
   * Parse TruffleHog output
   */
  parseTruffleHogOutput(output) {
    const findings = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const finding = JSON.parse(line);
        if (finding.SourceMetadata && finding.Raw) {
          findings.push({
            type: 'secret',
            severity: 'high',
            rule: finding.DetectorName || 'unknown',
            message: `Potential secret detected by ${finding.DetectorName}`,
            file: finding.SourceMetadata.Data?.Filesystem?.file || 'unknown',
            line: finding.SourceMetadata.Data?.Filesystem?.line || 0,
            secret: finding.Raw.substring(0, 10) + '...',
            verified: finding.Verified || false
          });
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    return findings;
  }

  /**
   * Parse Bun audit report
   */
  parseBunAudit(audit) {
    const findings = [];

    if (audit.vulnerabilities) {
      for (const vuln of audit.vulnerabilities) {
        findings.push({
          type: 'vulnerability',
          severity: this.mapSeverity(vuln.severity),
          rule: vuln.id,
          message: vuln.title,
          package: vuln.module_name,
          version: vuln.version,
          details: {
            cves: vuln.cves || [],
            overview: vuln.overview,
            recommendation: vuln.recommendation,
            url: vuln.url
          }
        });
      }
    }

    return findings;
  }

  /**
   * Parse npm audit report
   */
  parseNpmAudit(audit) {
    const findings = [];

    if (audit.vulnerabilities) {
      for (const [packageName, vuln] of Object.entries(audit.vulnerabilities)) {
        findings.push({
          type: 'vulnerability',
          severity: this.mapSeverity(vuln.severity),
          rule: vuln.source || 'npm-audit',
          message: vuln.title || `Vulnerability in ${packageName}`,
          package: packageName,
          version: vuln.version,
          details: {
            range: vuln.range,
            url: vuln.url,
            via: vuln.via
          }
        });
      }
    }

    return findings;
  }

  /**
   * Parse Semgrep report
   */
  parseSemgrepReport(report) {
    const findings = [];

    if (report.results) {
      for (const result of report.results) {
        findings.push({
          type: 'code_issue',
          severity: this.mapSemgrepSeverity(result.extra.severity),
          rule: result.check_id,
          message: result.extra.message,
          file: result.path,
          line: result.start.line,
          details: {
            category: result.extra.metadata?.category,
            owasp: result.extra.metadata?.owasp,
            confidence: result.extra.metadata?.confidence,
            fix: result.extra.fix
          }
        });
      }
    }

    return findings;
  }

  /**
   * Parse Trivy report
   */
  parseTrivyReport(report) {
    const findings = [];

    if (report.Results) {
      for (const result of report.Results) {
        if (result.Vulnerabilities) {
          for (const vuln of result.Vulnerabilities) {
            findings.push({
              type: 'container_vulnerability',
              severity: this.mapSeverity(vuln.Severity),
              rule: vuln.VulnerabilityID,
              message: vuln.Title || vuln.Description,
              package: vuln.PkgName,
              version: vuln.InstalledVersion,
              details: {
                fixedVersion: vuln.FixedVersion,
                references: vuln.References,
                cvss: vuln.CVSS,
                target: result.Target
              }
            });
          }
        }
      }
    }

    return findings;
  }

  /**
   * Map severity levels
   */
  mapSeverity(severity) {
    if (!severity) return 'unknown';

    const lower = severity.toLowerCase();
    const mapping = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'moderate': 'medium',
      'low': 'low',
      'info': 'info',
      'negligible': 'low'
    };

    return mapping[lower] || 'unknown';
  }

  /**
   * Map Semgrep severity
   */
  mapSemgrepSeverity(severity) {
    const mapping = {
      'ERROR': 'high',
      'WARNING': 'medium',
      'INFO': 'low'
    };

    return mapping[severity] || 'medium';
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    let totalVulnerabilities = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let passed = 0;
    let failed = 0;

    for (const scan of Object.values(this.scanResults.scans)) {
      if (scan.status === 'completed') {
        passed++;
      } else if (scan.status === 'failed') {
        failed++;
      }

      for (const finding of scan.findings) {
        totalVulnerabilities++;
        switch (finding.severity) {
          case 'critical':
            criticalCount++;
            break;
          case 'high':
            highCount++;
            break;
          case 'medium':
            mediumCount++;
            break;
          case 'low':
            lowCount++;
            break;
        }
      }
    }

    this.scanResults.summary = {
      totalVulnerabilities,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      passed,
      failed
    };
  }

  /**
   * Generate security report
   */
  generateReport() {
    this.generateSummary();

    const reportData = {
      ...this.scanResults,
      metadata: {
        scannerVersion: '1.0.0',
        projectName: 'StudyTeddy',
        environment: process.env.NODE_ENV || 'development',
        gitCommit: process.env.GITHUB_SHA || 'unknown',
        gitBranch: process.env.GITHUB_REF_NAME || 'unknown'
      }
    };

    // Save JSON report
    const jsonReportPath = join(this.reportsDir, 'security-report.json');
    writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));

    // Generate HTML report
    this.generateHTMLReport(reportData);

    // Generate SARIF report
    this.generateSARIFReport(reportData);

    this.log(`Security report generated: ${jsonReportPath}`);
    return reportData;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(data) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>StudyTeddy Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { padding: 15px; border-radius: 5px; text-align: center; min-width: 100px; }
        .critical { background: #ffebee; color: #c62828; }
        .high { background: #fff3e0; color: #f57c00; }
        .medium { background: #fff8e1; color: #f9a825; }
        .low { background: #f3e5f5; color: #8e24aa; }
        .scan-results { margin: 20px 0; }
        .scan { border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; }
        .scan-header { background: #f9f9f9; padding: 10px; font-weight: bold; }
        .finding { padding: 10px; border-bottom: 1px solid #eee; }
        .finding:last-child { border-bottom: none; }
        .severity-critical { border-left: 4px solid #c62828; }
        .severity-high { border-left: 4px solid #f57c00; }
        .severity-medium { border-left: 4px solid #f9a825; }
        .severity-low { border-left: 4px solid #8e24aa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>StudyTeddy Security Report</h1>
        <p><strong>Generated:</strong> ${data.timestamp}</p>
        <p><strong>Commit:</strong> ${data.metadata.gitCommit}</p>
        <p><strong>Branch:</strong> ${data.metadata.gitBranch}</p>
    </div>

    <div class="summary">
        <div class="metric critical">
            <h3>${data.summary.criticalCount}</h3>
            <p>Critical</p>
        </div>
        <div class="metric high">
            <h3>${data.summary.highCount}</h3>
            <p>High</p>
        </div>
        <div class="metric medium">
            <h3>${data.summary.mediumCount}</h3>
            <p>Medium</p>
        </div>
        <div class="metric low">
            <h3>${data.summary.lowCount}</h3>
            <p>Low</p>
        </div>
    </div>

    <div class="scan-results">
        <h2>Scan Results</h2>
        ${Object.entries(data.scans).map(([name, scan]) => `
            <div class="scan">
                <div class="scan-header">
                    ${scan.name} (${scan.status})
                </div>
                ${scan.findings.map(finding => `
                    <div class="finding severity-${finding.severity}">
                        <strong>${finding.message}</strong><br>
                        <small>${finding.file}:${finding.line || 'N/A'} - ${finding.rule}</small>
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;

    const htmlReportPath = join(this.reportsDir, 'security-report.html');
    writeFileSync(htmlReportPath, htmlContent);
  }

  /**
   * Generate SARIF report
   */
  generateSARIFReport(data) {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'StudyTeddy Security Scanner',
            version: '1.0.0',
            informationUri: 'https://github.com/mohamed-elkholy95/studyteddy'
          }
        },
        results: []
      }]
    };

    for (const scan of Object.values(data.scans)) {
      for (const finding of scan.findings) {
        sarif.runs[0].results.push({
          ruleId: finding.rule,
          message: {
            text: finding.message
          },
          level: this.mapSeverityToSARIF(finding.severity),
          locations: [{
            physicalLocation: {
              artifactLocation: {
                uri: finding.file || 'unknown'
              },
              region: {
                startLine: finding.line || 1
              }
            }
          }]
        });
      }
    }

    const sarifReportPath = join(this.reportsDir, 'security-report.sarif');
    writeFileSync(sarifReportPath, JSON.stringify(sarif, null, 2));
  }

  /**
   * Map severity to SARIF levels
   */
  mapSeverityToSARIF(severity) {
    const mapping = {
      'critical': 'error',
      'high': 'error',
      'medium': 'warning',
      'low': 'note',
      'info': 'note'
    };

    return mapping[severity] || 'warning';
  }

  /**
   * Run all security scans
   */
  async runAllScans(options = {}) {
    const {
      skipTools = false,
      scanTypes = ['secrets', 'dependencies', 'sast', 'containers', 'infrastructure', 'licenses']
    } = options;

    this.log('Starting comprehensive security scan...');

    if (!skipTools) {
      this.installTools();
    }

    const scanFunctions = {
      secrets: () => this.scanSecrets(),
      dependencies: () => this.scanDependencies(),
      sast: () => this.scanSAST(),
      containers: () => this.scanContainers(),
      infrastructure: () => this.scanInfrastructure(),
      licenses: () => this.scanLicenses()
    };

    for (const scanType of scanTypes) {
      if (scanFunctions[scanType]) {
        try {
          await scanFunctions[scanType]();
        } catch (error) {
          this.log(`Scan ${scanType} failed: ${error.message}`, 'ERROR');
        }
      }
    }

    const report = this.generateReport();
    this.log('Security scan completed');

    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scan-types':
        options.scanTypes = args[++i].split(',');
        break;
      case '--skip-tools':
        options.skipTools = true;
        break;
      case '--help':
        console.log(`
StudyTeddy Security Scanner

Usage: bun run scripts/security/security-scanner.js [options]

Options:
  --scan-types TYPE1,TYPE2  Specify scan types (secrets,dependencies,sast,containers,infrastructure,licenses)
  --skip-tools              Skip tool installation
  --help                    Show this help message

Examples:
  bun run scripts/security/security-scanner.js
  bun run scripts/security/security-scanner.js --scan-types secrets,dependencies
  bun run scripts/security/security-scanner.js --skip-tools
        `);
        process.exit(0);
        break;
    }
  }

  try {
    const scanner = new SecurityScanner();
    const report = await scanner.runAllScans(options);

    // Exit with error code if critical or high vulnerabilities found
    if (report.summary.criticalCount > 0 || report.summary.highCount > 0) {
      console.error(`\n❌ Security scan failed: ${report.summary.criticalCount} critical and ${report.summary.highCount} high severity vulnerabilities found`);
      process.exit(1);
    } else {
      console.log(`\n✅ Security scan passed: ${report.summary.totalVulnerabilities} total vulnerabilities found (none critical or high)`);
      process.exit(0);
    }
  } catch (error) {
    console.error('Security scan failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export default SecurityScanner;