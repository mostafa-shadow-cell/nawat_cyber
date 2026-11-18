import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS } from '../data/rooms';
import { evaluateTerminalCommand } from './terminal';

test('evaluateTerminalCommand handles ls, ls -la, cat, and grep in Linux room', () => {
  const linuxRoom = ROOMS[0];

  const lsPublic = evaluateTerminalCommand('ls', linuxRoom.terminal);
  assert.equal(lsPublic.isError, undefined);
  assert.ok(lsPublic.output.includes('readme.txt'));
  assert.ok(!lsPublic.output.includes('.hidden_secret'));

  const lsAll = evaluateTerminalCommand('ls -la', linuxRoom.terminal);
  assert.ok(lsAll.output.includes('.hidden_secret'));

  const catHidden = evaluateTerminalCommand('cat .hidden_secret', linuxRoom.terminal);
  assert.ok(catHidden.output.includes('FLAG{HIDDEN_DOTFILE_409}'));

  const grepLog = evaluateTerminalCommand('grep TOKEN_AUDIT auth.log', linuxRoom.terminal);
  assert.ok(grepLog.output.includes('FLAG{GREP_LOG_HUNTER_882}'));
});

test('evaluateTerminalCommand runs custom room commands and base64 decoding', () => {
  const nmapRoom = ROOMS[1];
  const nmapRes = evaluateTerminalCommand('nmap -sV 10.10.24.15', nmapRoom.terminal);
  assert.ok(nmapRes.output.includes('FLAG{NMAP_SERVICE_PORT_8080}'));

  const cryptoRoom = ROOMS[3];
  const b64Res = evaluateTerminalCommand(
    'base64 -d RkxBR3tCQVNFNjRfREVDT0RFUl8xNDd9',
    cryptoRoom.terminal
  );
  assert.equal(b64Res.output, 'FLAG{BASE64_DECODER_147}');
});

test('evaluateTerminalCommand handles clear and unknown commands safely', () => {
  const linuxRoom = ROOMS[0];

  const clearRes = evaluateTerminalCommand('clear', linuxRoom.terminal);
  assert.equal(clearRes.clear, true);

  const badRes = evaluateTerminalCommand('rm -rf /', linuxRoom.terminal);
  assert.equal(badRes.isError, true);
});
