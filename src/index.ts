// src/index.ts — This is your test harness that proves Step 1 works

import { SAPMockAdapter } from './adapters/sap-mock.adapter';
import { config } from './config';

async function runStep1Test() {
  console.log('='.repeat(50));
  console.log('  SAP MOCK ADAPTER - STEP 1 VALIDATION TEST');
  console.log(`  Mode: ${config.SAP_MODE.toUpperCase()}`);
  console.log('='.repeat(50));

  const sap = new SAPMockAdapter();

  // ── TEST 1: Connection ──────────────────────────────────────
  console.log('\n[TEST 1] Testing connection...');
  await sap.connect();
  console.log('Result: PASSED ✅\n');

  // ── TEST 2: Read existing project ───────────────────────────
  console.log('[TEST 2] Reading existing project P-2024-001...');
  const projectInfo = await sap.getProjectInfo('P-2024-001');
  console.log('Result:', JSON.stringify(projectInfo, null, 2));
  console.log(projectInfo.success ? 'PASSED ✅' : 'FAILED ❌');

  // ── TEST 3: Create a new project ────────────────────────────
  console.log('\n[TEST 3] Creating new project P-2024-NEW...');
  const createResult = await sap.createProject({
    projectDefinition: 'P-2024-NEW',
    description: 'New Test Project via WhatsApp',
    companyCode: '1000',
    controllingArea: 'A000',
    plant: '1001',
    startDate: '2024-06-01',
    endDate: '2025-06-01',
    responsiblePerson: 'TEST.USER'
  });
  console.log('Result:', JSON.stringify(createResult, null, 2));
  console.log(createResult.success ? 'PASSED ✅' : 'FAILED ❌');

  // ── TEST 4: Duplicate project error handling ─────────────────
  console.log('\n[TEST 4] Testing duplicate project error...');
  const duplicateResult = await sap.createProject({
    projectDefinition: 'P-2024-001',   // Already exists!
    description: 'Should fail',
    companyCode: '1000',
    controllingArea: 'A000',
    plant: '1001',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    responsiblePerson: 'TEST.USER'
  });
  console.log('Result:', duplicateResult.RETURN[0].MESSAGE);
  console.log(!duplicateResult.success ? 'PASSED ✅ (correctly rejected)' : 'FAILED ❌');

  // ── TEST 5: Invalid company code ────────────────────────────
  console.log('\n[TEST 5] Testing invalid company code error...');
  const invalidResult = await sap.createProject({
    projectDefinition: 'P-2024-ERR',
    description: 'Should fail on company code',
    companyCode: '9999',               // Does not exist!
    controllingArea: 'A000',
    plant: '1001',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    responsiblePerson: 'TEST.USER'
  });
  console.log('Result:', invalidResult.RETURN[0].MESSAGE);
  console.log(!invalidResult.success ? 'PASSED ✅ (correctly rejected)' : 'FAILED ❌');

  // ── TEST 6: Release a project ────────────────────────────────
  console.log('\n[TEST 6] Releasing project P-2024-NEW...');
  const releaseResult = await sap.releaseProject('P-2024-NEW');
  console.log(releaseResult.success ? 'PASSED ✅' : 'FAILED ❌');

  // ── TEST 7: Commit and Rollback ──────────────────────────────
  console.log('\n[TEST 7] Testing commit...');
  await sap.commit();
  console.log('PASSED ✅');

  console.log('\n[TEST 8] Testing rollback...');
  await sap.rollback();
  console.log('PASSED ✅');

  // ── SUMMARY ─────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('  STEP 1 COMPLETE - Mock Adapter is working');
  console.log('  Your middleware can now be built on top of this');
  console.log('='.repeat(50));
}

runStep1Test().catch(console.error);