import type { SimulatedTerminalConfig } from '../types/platform';
import { detectMaliciousPayload, sanitizeTerminalCommand } from './security';

export interface EvaluatedCommand {
  output: string;
  clear?: boolean;
  isError?: boolean;
}

export function evaluateTerminalCommand(
  rawInput: string,
  config: SimulatedTerminalConfig
): EvaluatedCommand {
  const threat = detectMaliciousPayload(rawInput, {
    checkSqlInjection: false,
  });
  if (!threat.safe) {
    return {
      output: 'Security policy: HTML/XSS control payloads are blocked in terminal input.',
      isError: true,
    };
  }

  const trimmed = sanitizeTerminalCommand(rawInput);
  if (!trimmed) {
    return { output: '' };
  }

  if (trimmed === 'clear' || trimmed === 'cls') {
    return { output: '', clear: true };
  }

  if (trimmed === 'help') {
    return {
      output: [
        'Available lab commands:',
        '  help                  Show available commands',
        '  ls [-la]              List files in current directory',
        '  cat <file>            Read file contents',
        '  grep <pattern> <file> Search pattern inside a file',
        '  whoami / id           Display current user identity',
        '  pwd                   Print working directory',
        '  clear                 Clear terminal output',
        '  + Room-specific tools (nmap, curl, strings, base64, find, sudo)',
      ].join('\n'),
    };
  }

  // Exact match in custom room commands first
  const normalized = trimmed.replace(/\s+/g, ' ');
  if (config.customCommands[normalized]) {
    return { output: config.customCommands[normalized] };
  }

  // Check prefix/alias matches in customCommands (e.g. "nmap -sV 10.10.24.15")
  const [cmd, ...args] = normalized.split(' ');

  if (cmd === 'pwd') {
    return { output: config.cwd };
  }

  if (cmd === 'whoami') {
    return { output: config.username };
  }

  if (cmd === 'id') {
    return {
      output: `uid=1000(${config.username}) gid=1000(${config.username}) groups=1000(${config.username}),27(sudo)`,
    };
  }

  if (cmd === 'ls') {
    const showAll = args.includes('-la') || args.includes('-a') || args.includes('-al');
    const fileNames = Object.keys(config.files);
    if (showAll) {
      const lines = [
        'total 24',
        `drwxr-xr-x 2 ${config.username} ${config.username} 4096 Nov 18 10:15 .`,
        'drwxr-xr-x 3 root     root     4096 Nov 18 09:00 ..',
        ...fileNames.map(
          (name) =>
            `-rw-r--r-- 1 ${config.username} ${config.username} ${String(
              config.files[name].length
            ).padStart(4, ' ')} Nov 18 10:12 ${name}`
        ),
      ];
      return { output: lines.join('\n') };
    }
    const visible = fileNames.filter((name) => !name.startsWith('.'));
    return { output: visible.join('  ') };
  }

  if (cmd === 'cat') {
    const target = args[0];
    if (!target) {
      return { output: 'cat: missing file operand', isError: true };
    }
    const cleanTarget = target.replace(/^\.\//, '');
    if (config.files[cleanTarget] !== undefined) {
      return { output: config.files[cleanTarget] };
    }
    return {
      output: `cat: ${target}: No such file or directory`,
      isError: true,
    };
  }

  if (cmd === 'grep') {
    if (args.length < 2) {
      return {
        output: 'Usage: grep <pattern> <filename>',
        isError: true,
      };
    }
    const patternRaw = args[0].replace(/^['"]|['"]$/g, '');
    const fileTarget = args[1].replace(/^\.\//, '');
    const content = config.files[fileTarget];
    if (content === undefined) {
      return {
        output: `grep: ${args[1]}: No such file or directory`,
        isError: true,
      };
    }
    const matches = content
      .split('\n')
      .filter((line) => line.toLowerCase().includes(patternRaw.toLowerCase()));
    return {
      output:
        matches.length > 0
          ? matches.join('\n')
          : `(no matches found for "${patternRaw}")`,
    };
  }

  if (cmd === 'strings') {
    const target = args[0]?.replace(/^\.\//, '');
    if (!target) {
      return { output: 'strings: missing file operand', isError: true };
    }
    if (config.files[target] !== undefined) {
      return { output: config.files[target] };
    }
    return {
      output: `strings: '${args[0]}': No such file`,
      isError: true,
    };
  }

  if (cmd === 'base64' && (args.includes('-d') || args.includes('--decode'))) {
    // Support: base64 -d <string> or check if a custom command matches
    const encoded = args.find((a) => !a.startsWith('-'));
    if (!encoded) {
      return {
        output: 'Usage: base64 -d <encoded_string>',
        isError: true,
      };
    }
    try {
      const decoded = atob(encoded);
      return { output: decoded };
    } catch {
      return { output: 'base64: invalid input', isError: true };
    }
  }

  if (cmd === 'echo' && normalized.includes('| base64 -d')) {
    const match = normalized.match(/echo\s+['"]?([A-Za-z0-9+/=]+)['"]?\s*\|\s*base64\s+-d/);
    if (match?.[1]) {
      try {
        return { output: atob(match[1]) };
      } catch {
        return { output: 'base64: invalid input', isError: true };
      }
    }
  }

  return {
    output: `bash: ${cmd}: command not found or restricted in lab sandbox. Type 'help' for guidance.`,
    isError: true,
  };
}
