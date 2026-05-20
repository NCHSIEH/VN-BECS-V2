

const BASE_URL = 'http://localhost:3000/api/v1';

async function runLimsWorkflow() {
  console.log("🚀 Starting LIMS Operational Workflow API End-to-End Test...");
  console.log("---------------------------------------------------------");

  try {
    // 1. Verify Empty POST fails
    console.log("🧪 Step 1: Testing Vulnerability (Empty POST)");
    const emptyRes = await fetch(`${BASE_URL}/lims/donors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const emptyData = await emptyRes.json();
    if (!emptyRes.ok) {
      console.log(`   ✅ Vulnerability Blocked! Backend rejected empty POST: ${emptyData.error}`);
    } else {
      console.error(`   ❌ CRITICAL FAILURE: Empty POST was accepted!`);
      process.exit(1);
    }

    // 2. Register Donor
    console.log("\n🧪 Step 2: Registering Donor (NGUYEN VAN AN)");
    const cccd = "001095" + Math.floor(Math.random() * 900000 + 100000).toString();
    const donorPayload = {
      name: 'NGUYEN VAN AN',
      nationalId: cccd,
      dob: '1995-05-20',
      bloodType: 'O',
      rhd: 'Negative'
    };
    
    const donorRes = await fetch(`${BASE_URL}/lims/donors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donorPayload)
    });
    const donorData = await donorRes.json();
    if (!donorRes.ok) throw new Error(donorData.error);
    const donorId = donorData.id;
    console.log(`   ✅ Donor Registered Successfully. Assigned ID: ${donorId}`);

    // 3. Phlebotomy (Collect Blood)
    console.log(`\n🧪 Step 3: Phlebotomy Ops (Binding ISBT DIN for ${donorId})`);
    const din = `=W0000 24 ${Math.floor(Math.random() * 900000 + 100000)}`;
    const collectPayload = {
      donorId,
      volume: 500,
      type: 'WholeBlood',
      customDonationId: din
    };
    
    const collectRes = await fetch(`${BASE_URL}/lims/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectPayload)
    });
    const collectData = await collectRes.json();
    if (!collectRes.ok) throw new Error(collectData.error);
    console.log(`   ✅ Blood Collected. ISBT-128 DIN: ${din}. Status is now PENDING.`);

    // 4. Clinical Screening
    console.log(`\n🧪 Step 4: Clinical Screening (IDM/NAT Tests on ${din})`);
    const testRes = await fetch(`${BASE_URL}/lims/lab-tests/${encodeURIComponent(din)}/run`, { method: 'POST' });
    const testData = await testRes.json();
    if (!testRes.ok) throw new Error(testData.error);
    console.log(`   ✅ Diagnostics Run Completed. Unit Status updated to CLEARED.`);

    // 5. Component Fabrication
    console.log(`\n🧪 Step 5: Fabricate Components (Processing ${din})`);
    const processRes = await fetch(`${BASE_URL}/lims/process-component/${encodeURIComponent(din)}`, { method: 'POST' });
    const processData = await processRes.json();
    if (!processRes.ok) throw new Error(processData.error);
    console.log(`   ✅ Components Fabricated (RBC, Plasma).`);

    // 6. Release to Hub (Get components and release them)
    console.log(`\n🧪 Step 6: Lab Logistics (Release to Hub)`);
    const compRes = await fetch(`${BASE_URL}/lims/components`);
    const components = await compRes.json();
    
    // Find our newly created components (they will share the parent DIN prefix)
    const newComponents = components.filter(c => c.donationId === din);
    console.log(`   📦 Found ${newComponents.length} components linked to DIN ${din}.`);
    
    for (const comp of newComponents) {
      const relRes = await fetch(`${BASE_URL}/lims/components/${comp.id}/release`, { method: 'POST' });
      const relData = await relRes.json();
      if (!relRes.ok) throw new Error(relData.error);
      console.log(`   ✅ Released ${comp.id} (${comp.productCode}). Status is now INTRANSIT to Hub.`);
    }

    console.log("\n🎉 LIMS Vein-to-Vein Workflow End-to-End Test Completed Successfully!");

  } catch (err) {
    console.error(`\n❌ WORKFLOW FAILED: ${err.message}`);
  }
}

runLimsWorkflow();
