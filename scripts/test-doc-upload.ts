import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '../utils/supabase/server';
import { addDocument, getDocuments, deleteDocument } from '../app/actions/documents';
import { getPresignedUrl } from '../app/actions/r2';

async function runTest() {
  console.log('--- STARTING DOCUMENT UPLOAD OPERATIONS TEST ---');
  let testSuccess = true;
  let testCustomerId: string | null = null;
  let createdTempCustomer = false;

  try {
    const supabase = await createClient();

    // Fetch existing customer or create a temporary customer for foreign key reference
    const { data: existingCustomers } = await supabase.from('customers').select('id').limit(1);
    if (existingCustomers && existingCustomers.length > 0) {
      testCustomerId = existingCustomers[0].id;
    } else {
      const { data: newCust } = await supabase
        .from('customers')
        .insert({ name: 'Doc Test Customer', phone: '000000000' })
        .select('id')
        .single();
      if (newCust) {
        testCustomerId = newCust.id;
        createdTempCustomer = true;
      }
    }

    if (!testCustomerId) {
      throw new Error('Failed to resolve test customer ID');
    }

    // Test 1: Test R2 Presigned URL generation
    console.log('\n[Test 1] Testing R2 presigned URL generation...');
    const presigned = await getPresignedUrl('test-passport-scan.pdf', 'application/pdf');
    if (!presigned.success || !presigned.uploadUrl || !presigned.fileKey) {
      console.error('FAILED: Presigned URL error:', presigned.error);
      testSuccess = false;
    } else {
      console.log('SUCCESS: Generated presigned upload URL and file key:', presigned.fileKey);
    }

    // Test 2: Database Document Registration (addDocument)
    console.log('\n[Test 2] Testing addDocument database operation...');
    const testDocTitle = `Automated Test Document ${Date.now()}`;
    const testFileKey = presigned.fileKey || `test-key-${Date.now()}.pdf`;
    const testFileUrl = presigned.publicUrl || `https://example.com/${testFileKey}`;

    const addRes = await addDocument({
      customerId: testCustomerId,
      title: testDocTitle,
      file_url: testFileUrl,
      file_key: testFileKey,
      tag: 'Test',
    });

    if (addRes.error) {
      console.error('FAILED: addDocument error:', addRes.error);
      testSuccess = false;
    } else {
      console.log('SUCCESS: Document entry added successfully.');
    }

    // Test 3: Fetching Documents (getDocuments)
    console.log('\n[Test 3] Testing getDocuments database fetch...');
    const getRes = await getDocuments(testCustomerId);
    if (getRes.error || !getRes.documents) {
      console.error('FAILED: getDocuments error:', getRes.error);
      testSuccess = false;
    } else {
      console.log(`SUCCESS: Fetched ${getRes.documents.length} document(s).`);
      const createdDoc = getRes.documents.find((d: any) => d.title === testDocTitle);

      if (!createdDoc) {
        console.error('FAILED: Created document not found in fetched list.');
        testSuccess = false;
      } else {
        console.log('SUCCESS: Found created document record:');
        console.log(`  - ID: ${createdDoc.id}`);
        console.log(`  - Title: ${createdDoc.title}`);
        console.log(`  - File URL: ${createdDoc.file_url}`);
        console.log(`  - File Key: ${createdDoc.file_key}`);
        console.log(`  - Created At: ${createdDoc.created_at}`);

        // Test 4: Delete Document (deleteDocument)
        console.log('\n[Test 4] Testing deleteDocument operation...');
        const delRes = await deleteDocument(createdDoc.id, createdDoc.file_key);
        if (delRes.error) {
          console.error('FAILED: deleteDocument error:', delRes.error);
          testSuccess = false;
        } else {
          console.log('SUCCESS: Document deleted cleanly from DB.');
        }
      }
    }

    // Cleanup temp customer if created
    if (createdTempCustomer && testCustomerId) {
      await supabase.from('customers').delete().eq('id', testCustomerId);
    }
  } catch (err: any) {
    console.error('TEST EXCEPTION:', err);
    testSuccess = false;
  }

  console.log('\n--- DOCUMENT OPERATIONS TEST SUMMARY ---');
  if (testSuccess) {
    console.log('ALL DOCUMENT UPLOAD TESTS PASSED SUCCESSFULLY! ✅');
  } else {
    console.log('DOCUMENT UPLOAD TESTS COMPLETED WITH ERRORS. ❌');
    process.exit(1);
  }
}

runTest();
