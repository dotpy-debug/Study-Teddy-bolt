#!/usr/bin/env bun

/**
 * Feature Flag Management System for StudyTeddy
 * Handles feature flag configuration, deployment, and management across environments
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

class FeatureFlagManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.flagsDir = join(this.projectRoot, 'config/feature-flags');
    this.environments = ['development', 'staging', 'production'];

    // Ensure feature flags directory exists
    if (!existsSync(this.flagsDir)) {
      mkdirSync(this.flagsDir, { recursive: true });
    }
  }

  /**
   * Get feature flags configuration for an environment
   */
  getFeatureFlags(environment = 'development') {
    const flagsFile = join(this.flagsDir, `${environment}.json`);

    if (!existsSync(flagsFile)) {
      return this.getDefaultFlags();
    }

    try {
      return JSON.parse(readFileSync(flagsFile, 'utf8'));
    } catch (error) {
      console.error(`Error reading feature flags for ${environment}:`, error.message);
      return this.getDefaultFlags();
    }
  }

  /**
   * Get default feature flags configuration
   */
  getDefaultFlags() {
    return {
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      flags: {
        // Authentication & User Management
        enableSocialLogin: {
          enabled: false,
          rollout: 0,
          description: 'Enable social media login (Google, GitHub, etc.)',
          category: 'authentication',
          dependencies: [],
          variants: {
            google: false,
            github: false,
            discord: false
          }
        },
        enableTwoFactorAuth: {
          enabled: false,
          rollout: 0,
          description: 'Enable two-factor authentication',
          category: 'security',
          dependencies: ['enableSocialLogin']
        },
        enablePasswordlessLogin: {
          enabled: false,
          rollout: 0,
          description: 'Enable passwordless login via magic links',
          category: 'authentication',
          dependencies: []
        },

        // AI Features
        enableAdvancedAI: {
          enabled: false,
          rollout: 0,
          description: 'Enable advanced AI features (GPT-4, etc.)',
          category: 'ai',
          dependencies: [],
          costImpact: 'high'
        },
        enableAITutoring: {
          enabled: false,
          rollout: 0,
          description: 'Enable AI-powered tutoring sessions',
          category: 'ai',
          dependencies: ['enableAdvancedAI'],
          costImpact: 'medium'
        },
        enableSmartRecommendations: {
          enabled: true,
          rollout: 100,
          description: 'Enable AI-powered study recommendations',
          category: 'ai',
          dependencies: [],
          costImpact: 'low'
        },
        enableAutoQuizGeneration: {
          enabled: true,
          rollout: 50,
          description: 'Enable automatic quiz generation from study materials',
          category: 'ai',
          dependencies: [],
          costImpact: 'medium'
        },

        // Study Features
        enableCollaborativeStudy: {
          enabled: false,
          rollout: 0,
          description: 'Enable collaborative study sessions',
          category: 'collaboration',
          dependencies: [],
          variants: {
            realTimeEditing: false,
            voiceChat: false,
            screenSharing: false
          }
        },
        enableStudyGroups: {
          enabled: true,
          rollout: 80,
          description: 'Enable study group creation and management',
          category: 'collaboration',
          dependencies: []
        },
        enableOfflineMode: {
          enabled: false,
          rollout: 0,
          description: 'Enable offline study mode with sync',
          category: 'performance',
          dependencies: []
        },
        enableAdvancedScheduling: {
          enabled: true,
          rollout: 100,
          description: 'Enable advanced study scheduling features',
          category: 'productivity',
          dependencies: []
        },

        // Gamification
        enableGamification: {
          enabled: true,
          rollout: 90,
          description: 'Enable gamification features (points, badges, etc.)',
          category: 'engagement',
          dependencies: [],
          variants: {
            achievements: true,
            leaderboards: true,
            streaks: true,
            rewards: false
          }
        },
        enableLeaderboards: {
          enabled: true,
          rollout: 70,
          description: 'Enable competitive leaderboards',
          category: 'engagement',
          dependencies: ['enableGamification']
        },

        // Analytics & Monitoring
        enableAdvancedAnalytics: {
          enabled: false,
          rollout: 0,
          description: 'Enable advanced analytics and insights',
          category: 'analytics',
          dependencies: []
        },
        enablePerformanceMonitoring: {
          enabled: true,
          rollout: 100,
          description: 'Enable performance monitoring and metrics',
          category: 'monitoring',
          dependencies: []
        },
        enableErrorReporting: {
          enabled: true,
          rollout: 100,
          description: 'Enable error reporting and crash analytics',
          category: 'monitoring',
          dependencies: []
        },

        // UI/UX Features
        enableDarkMode: {
          enabled: true,
          rollout: 100,
          description: 'Enable dark mode theme',
          category: 'ui',
          dependencies: []
        },
        enableCustomThemes: {
          enabled: false,
          rollout: 0,
          description: 'Enable custom theme creation and sharing',
          category: 'ui',
          dependencies: ['enableDarkMode']
        },
        enableAccessibilityFeatures: {
          enabled: true,
          rollout: 100,
          description: 'Enable enhanced accessibility features',
          category: 'accessibility',
          dependencies: []
        },
        enableMobileOptimizations: {
          enabled: true,
          rollout: 100,
          description: 'Enable mobile-specific optimizations',
          category: 'mobile',
          dependencies: []
        },

        // Payments & Subscriptions
        enableSubscriptions: {
          enabled: false,
          rollout: 0,
          description: 'Enable subscription management',
          category: 'billing',
          dependencies: [],
          variants: {
            monthly: false,
            yearly: false,
            student: false,
            team: false
          }
        },
        enableInAppPurchases: {
          enabled: false,
          rollout: 0,
          description: 'Enable in-app purchases for premium features',
          category: 'billing',
          dependencies: ['enableSubscriptions']
        },

        // Content Management
        enableContentSharing: {
          enabled: true,
          rollout: 80,
          description: 'Enable content sharing between users',
          category: 'content',
          dependencies: []
        },
        enableContentMarketplace: {
          enabled: false,
          rollout: 0,
          description: 'Enable marketplace for study materials',
          category: 'content',
          dependencies: ['enableContentSharing', 'enableSubscriptions']
        },

        // Experimental Features
        enableBetaFeatures: {
          enabled: false,
          rollout: 5,
          description: 'Enable access to beta features for testing',
          category: 'experimental',
          dependencies: []
        },
        enableFeaturePreviews: {
          enabled: false,
          rollout: 10,
          description: 'Enable preview of upcoming features',
          category: 'experimental',
          dependencies: []
        }
      }
    };
  }

  /**
   * Set feature flag for specific environment
   */
  setFeatureFlag(environment, flagName, config) {
    const flags = this.getFeatureFlags(environment);

    if (!flags.flags[flagName]) {
      flags.flags[flagName] = {};
    }

    // Merge configuration
    flags.flags[flagName] = {
      ...flags.flags[flagName],
      ...config,
      lastUpdated: new Date().toISOString()
    };

    // Update metadata
    flags.metadata.lastUpdated = new Date().toISOString();
    flags.metadata.updatedBy = process.env.USER || 'system';

    this.saveFeatureFlags(environment, flags);

    console.log(`✅ Updated feature flag '${flagName}' in ${environment}`);
    return flags.flags[flagName];
  }

  /**
   * Enable feature flag across environments with rollout strategy
   */
  enableFeature(flagName, rolloutStrategy = {}) {
    const {
      development = 100,
      staging = 100,
      production = 0,
      dependencies = [],
      variants = {}
    } = rolloutStrategy;

    const environmentRollouts = {
      development,
      staging,
      production
    };

    for (const env of this.environments) {
      const rollout = environmentRollouts[env];

      this.setFeatureFlag(env, flagName, {
        enabled: rollout > 0,
        rollout,
        dependencies,
        variants,
        deployedAt: new Date().toISOString()
      });
    }

    console.log(`🚀 Deployed feature '${flagName}' with rollout strategy:`, environmentRollouts);
  }

  /**
   * Disable feature flag across all environments
   */
  disableFeature(flagName) {
    for (const env of this.environments) {
      this.setFeatureFlag(env, flagName, {
        enabled: false,
        rollout: 0,
        disabledAt: new Date().toISOString()
      });
    }

    console.log(`🛑 Disabled feature '${flagName}' across all environments`);
  }

  /**
   * Gradually rollout feature flag in production
   */
  gradualRollout(flagName, targetRollout, steps = 5, intervalHours = 24) {
    const currentFlags = this.getFeatureFlags('production');
    const currentRollout = currentFlags.flags[flagName]?.rollout || 0;

    if (currentRollout >= targetRollout) {
      console.log(`✅ Feature '${flagName}' already at or above target rollout (${currentRollout}%)`);
      return;
    }

    const increment = Math.ceil((targetRollout - currentRollout) / steps);
    let nextRollout = currentRollout;

    console.log(`📈 Starting gradual rollout of '${flagName}' from ${currentRollout}% to ${targetRollout}%`);
    console.log(`   Steps: ${steps}, Increment: ${increment}%, Interval: ${intervalHours}h`);

    for (let step = 1; step <= steps; step++) {
      nextRollout = Math.min(nextRollout + increment, targetRollout);

      const deployTime = new Date(Date.now() + (step - 1) * intervalHours * 60 * 60 * 1000);

      console.log(`   Step ${step}: ${nextRollout}% at ${deployTime.toISOString()}`);

      // In a real implementation, this would schedule the deployment
      // For now, we'll just update the flag immediately for the last step
      if (step === steps || nextRollout === targetRollout) {
        this.setFeatureFlag('production', flagName, {
          enabled: nextRollout > 0,
          rollout: nextRollout,
          rolloutStep: step,
          rolloutTotal: steps
        });
        break;
      }
    }
  }

  /**
   * Validate feature flag dependencies
   */
  validateDependencies(environment, flagName) {
    const flags = this.getFeatureFlags(environment);
    const flag = flags.flags[flagName];

    if (!flag || !flag.dependencies) {
      return { valid: true, missingDependencies: [] };
    }

    const missingDependencies = [];

    for (const dependency of flag.dependencies) {
      const depFlag = flags.flags[dependency];
      if (!depFlag || !depFlag.enabled || depFlag.rollout === 0) {
        missingDependencies.push(dependency);
      }
    }

    return {
      valid: missingDependencies.length === 0,
      missingDependencies
    };
  }

  /**
   * Get feature flag status across all environments
   */
  getFeatureStatus(flagName) {
    const status = {};

    for (const env of this.environments) {
      const flags = this.getFeatureFlags(env);
      const flag = flags.flags[flagName];

      status[env] = {
        enabled: flag?.enabled || false,
        rollout: flag?.rollout || 0,
        lastUpdated: flag?.lastUpdated,
        dependencies: flag?.dependencies || [],
        variants: flag?.variants || {}
      };
    }

    return status;
  }

  /**
   * Save feature flags to file
   */
  saveFeatureFlags(environment, flags) {
    const flagsFile = join(this.flagsDir, `${environment}.json`);
    writeFileSync(flagsFile, JSON.stringify(flags, null, 2));
  }

  /**
   * Generate feature flags documentation
   */
  generateDocumentation() {
    const developmentFlags = this.getFeatureFlags('development');
    const categories = {};

    // Group flags by category
    Object.entries(developmentFlags.flags).forEach(([name, flag]) => {
      const category = flag.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({ name, ...flag });
    });

    let markdown = `# Feature Flags Documentation\n\n`;
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `This document describes all available feature flags in the StudyTeddy application.\n\n`;

    // Add status table
    markdown += `## Status Overview\n\n`;
    markdown += `| Flag | Development | Staging | Production | Description |\n`;
    markdown += `|------|-------------|---------|------------|-------------|\n`;

    Object.entries(developmentFlags.flags).forEach(([name, flag]) => {
      const status = this.getFeatureStatus(name);
      const devStatus = status.development.enabled ? `✅ ${status.development.rollout}%` : '❌ 0%';
      const stagingStatus = status.staging.enabled ? `✅ ${status.staging.rollout}%` : '❌ 0%';
      const prodStatus = status.production.enabled ? `✅ ${status.production.rollout}%` : '❌ 0%';

      markdown += `| ${name} | ${devStatus} | ${stagingStatus} | ${prodStatus} | ${flag.description || 'No description'} |\n`;
    });

    markdown += `\n`;

    // Add detailed sections by category
    Object.entries(categories).forEach(([category, flags]) => {
      markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Features\n\n`;

      flags.forEach(flag => {
        markdown += `### ${flag.name}\n\n`;
        markdown += `**Description:** ${flag.description || 'No description available'}\n\n`;

        if (flag.dependencies && flag.dependencies.length > 0) {
          markdown += `**Dependencies:** ${flag.dependencies.join(', ')}\n\n`;
        }

        if (flag.costImpact) {
          markdown += `**Cost Impact:** ${flag.costImpact}\n\n`;
        }

        if (flag.variants && Object.keys(flag.variants).length > 0) {
          markdown += `**Variants:**\n`;
          Object.entries(flag.variants).forEach(([variant, enabled]) => {
            markdown += `- ${variant}: ${enabled ? 'Enabled' : 'Disabled'}\n`;
          });
          markdown += `\n`;
        }

        // Add status across environments
        const status = this.getFeatureStatus(flag.name);
        markdown += `**Environment Status:**\n`;
        this.environments.forEach(env => {
          const envStatus = status[env];
          markdown += `- ${env}: ${envStatus.enabled ? `Enabled (${envStatus.rollout}%)` : 'Disabled'}\n`;
        });

        markdown += `\n---\n\n`;
      });
    });

    // Add usage examples
    markdown += `## Usage Examples\n\n`;
    markdown += `### Enable a feature flag\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `bun run scripts/release/feature-flags.js enable myFeature --rollout "development=100,staging=50,production=0"\n`;
    markdown += `\`\`\`\n\n`;

    markdown += `### Disable a feature flag\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `bun run scripts/release/feature-flags.js disable myFeature\n`;
    markdown += `\`\`\`\n\n`;

    markdown += `### Gradual rollout\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `bun run scripts/release/feature-flags.js rollout myFeature --target 100 --steps 5\n`;
    markdown += `\`\`\`\n\n`;

    const docsPath = join(this.projectRoot, 'docs/FEATURE_FLAGS.md');
    writeFileSync(docsPath, markdown);

    console.log(`📚 Generated feature flags documentation at ${docsPath}`);
    return docsPath;
  }

  /**
   * Deploy feature flags to remote configuration service
   */
  deployFlags(environment) {
    const flags = this.getFeatureFlags(environment);

    // This would integrate with your configuration service (e.g., LaunchDarkly, ConfigCat, etc.)
    console.log(`🚀 Deploying feature flags to ${environment}...`);

    // Example: Deploy to Kubernetes ConfigMap
    this.deployToKubernetes(environment, flags);

    // Example: Deploy to AWS Parameter Store
    this.deployToParameterStore(environment, flags);

    console.log(`✅ Successfully deployed feature flags to ${environment}`);
  }

  /**
   * Deploy to Kubernetes as ConfigMap
   */
  deployToKubernetes(environment, flags) {
    const configMapName = `studyteddy-feature-flags-${environment}`;
    const namespace = `studyteddy-${environment}`;

    const configMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: configMapName,
        namespace: namespace,
        labels: {
          app: 'studyteddy',
          component: 'feature-flags',
          environment: environment
        }
      },
      data: {
        'feature-flags.json': JSON.stringify(flags, null, 2)
      }
    };

    const configMapPath = join(this.flagsDir, `${environment}-configmap.yaml`);
    const yaml = `# Generated ConfigMap for ${environment} feature flags\n${JSON.stringify(configMap, null, 2)}`;

    writeFileSync(configMapPath, yaml);

    try {
      execSync(`kubectl apply -f ${configMapPath}`, { stdio: 'inherit' });
      console.log(`✅ Deployed feature flags ConfigMap to ${namespace}`);
    } catch (error) {
      console.warn(`⚠️  Could not deploy to Kubernetes: ${error.message}`);
    }
  }

  /**
   * Deploy to AWS Parameter Store
   */
  deployToParameterStore(environment, flags) {
    const parameterName = `/studyteddy/${environment}/feature-flags`;
    const parameterValue = JSON.stringify(flags);

    try {
      execSync(`aws ssm put-parameter --name "${parameterName}" --value '${parameterValue}' --type String --overwrite`, { stdio: 'inherit' });
      console.log(`✅ Deployed feature flags to AWS Parameter Store: ${parameterName}`);
    } catch (error) {
      console.warn(`⚠️  Could not deploy to AWS Parameter Store: ${error.message}`);
    }
  }

  /**
   * Initialize feature flags for new environment
   */
  initializeEnvironment(environment) {
    if (this.environments.includes(environment)) {
      console.log(`Environment ${environment} already exists`);
      return;
    }

    const defaultFlags = this.getDefaultFlags();

    // Apply conservative defaults for new environments
    Object.values(defaultFlags.flags).forEach(flag => {
      flag.enabled = false;
      flag.rollout = 0;
    });

    this.saveFeatureFlags(environment, defaultFlags);
    this.environments.push(environment);

    console.log(`✅ Initialized feature flags for new environment: ${environment}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const manager = new FeatureFlagManager();

  if (args.length === 0) {
    console.log(`
StudyTeddy Feature Flag Management

Usage: bun run scripts/release/feature-flags.js <command> [options]

Commands:
  enable <flag>           Enable a feature flag
  disable <flag>          Disable a feature flag
  status [flag]           Show feature flag status
  rollout <flag>          Gradual rollout of a feature
  deploy <env>            Deploy flags to environment
  docs                    Generate documentation
  init <env>              Initialize new environment
  validate <env> <flag>   Validate flag dependencies

Examples:
  bun run scripts/release/feature-flags.js enable enableSocialLogin --rollout "development=100,staging=50"
  bun run scripts/release/feature-flags.js rollout enableAITutoring --target 100 --steps 5
  bun run scripts/release/feature-flags.js status enableGamification
  bun run scripts/release/feature-flags.js deploy production
    `);
    return;
  }

  const command = args[0];
  const flagName = args[1];

  try {
    switch (command) {
      case 'enable':
        if (!flagName) {
          console.error('Flag name is required');
          process.exit(1);
        }

        const rolloutArg = args.find(arg => arg.startsWith('--rollout'));
        let rolloutStrategy = {};

        if (rolloutArg) {
          const rolloutValue = rolloutArg.split('=')[1] || args[args.indexOf(rolloutArg) + 1];
          const rollouts = rolloutValue.split(',');
          rollouts.forEach(rollout => {
            const [env, percentage] = rollout.split('=');
            rolloutStrategy[env] = parseInt(percentage);
          });
        }

        manager.enableFeature(flagName, rolloutStrategy);
        break;

      case 'disable':
        if (!flagName) {
          console.error('Flag name is required');
          process.exit(1);
        }
        manager.disableFeature(flagName);
        break;

      case 'status':
        if (flagName) {
          const status = manager.getFeatureStatus(flagName);
          console.log(`\nFeature Flag Status: ${flagName}\n`);
          console.table(status);
        } else {
          // Show all flags
          const devFlags = manager.getFeatureFlags('development');
          const statusTable = {};

          Object.keys(devFlags.flags).forEach(name => {
            const status = manager.getFeatureStatus(name);
            statusTable[name] = {
              development: status.development.enabled ? `${status.development.rollout}%` : 'Disabled',
              staging: status.staging.enabled ? `${status.staging.rollout}%` : 'Disabled',
              production: status.production.enabled ? `${status.production.rollout}%` : 'Disabled'
            };
          });

          console.log('\nAll Feature Flags Status:\n');
          console.table(statusTable);
        }
        break;

      case 'rollout':
        if (!flagName) {
          console.error('Flag name is required');
          process.exit(1);
        }

        const targetArg = args.find(arg => arg.startsWith('--target'));
        const stepsArg = args.find(arg => arg.startsWith('--steps'));

        const target = targetArg ? parseInt(targetArg.split('=')[1] || args[args.indexOf(targetArg) + 1]) : 100;
        const steps = stepsArg ? parseInt(stepsArg.split('=')[1] || args[args.indexOf(stepsArg) + 1]) : 5;

        manager.gradualRollout(flagName, target, steps);
        break;

      case 'deploy':
        const environment = flagName || 'development';
        manager.deployFlags(environment);
        break;

      case 'docs':
        manager.generateDocumentation();
        break;

      case 'init':
        const newEnv = flagName;
        if (!newEnv) {
          console.error('Environment name is required');
          process.exit(1);
        }
        manager.initializeEnvironment(newEnv);
        break;

      case 'validate':
        const env = flagName;
        const flag = args[2];
        if (!env || !flag) {
          console.error('Environment and flag name are required');
          process.exit(1);
        }

        const validation = manager.validateDependencies(env, flag);
        if (validation.valid) {
          console.log(`✅ Feature flag '${flag}' dependencies are satisfied in ${env}`);
        } else {
          console.log(`❌ Feature flag '${flag}' has missing dependencies in ${env}:`);
          validation.missingDependencies.forEach(dep => {
            console.log(`  - ${dep}`);
          });
        }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export default FeatureFlagManager;