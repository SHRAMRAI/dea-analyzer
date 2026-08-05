'use strict';
// ============================================================
// DEMO DATA - Pre-loaded with patterns that tell operational stories
// 
// STORIES THIS DATA TELLS:
// 1. F18 has a MECHANICAL PROBLEM - recurring jams, high duration
// 2. User jsmith42 made BAD CONFIG CHANGES on 3/15 that caused missorts
// 3. NIGHT SHIFT misses CPT 3x more than Day shift
// 4. F62 is an OVERFLOW CHUTE - receives packages from F54, F55, F53
// 5. Route CX-7832 has worst DEA because it goes through broken F18
// ============================================================
var DEMO_DATA = {};

// Generate shipment data - 220 records across 5 days
// Pattern: CX-7832 (goes to F18) has 40% miss rate, others ~10%
DEMO_DATA.shipments = (function(){
  var rows = [];
  var routes = ['CX-7832','CX-4521','CX-9011','CX-3344','CX-5566','CX-2211','CX-8877'];
  var chutes = {
    'CX-7832':'F18','CX-4521':'F12','CX-9011':'F05',
    'CX-3344':'F09','CX-5566':'F31','CX-2211':'F15','CX-8877':'F27'
  };
  var days = ['2024-03-15','2024-03-16','2024-03-17','2024-03-18','2024-03-19'];
  var shifts = ['Day','Night'];
  var id = 100;

  days.forEach(function(day){
    shifts.forEach(function(shift){
      var baseHour = shift === 'Day' ? 6 : 18;
      routes.forEach(function(route){
        // Each route gets ~3-4 packages per shift
        var count = 3 + Math.floor(Math.random()*2);
        for(var i=0; i<count; i++){
          id++;
          var hour = baseHour + Math.floor(i*2);
          var min = Math.floor(Math.random()*59);
          var time = day+' '+String(hour).padStart(2,'0')+':'+String(min).padStart(2,'0')+':00';
          var isMiss = false;
          var l0 = 'Good';
          var l1 = 'On Time';
          var bucket = 'Good - On Time';
          var chute = chutes[route];
          var missQty = '0';

          // CX-7832 -> F18: 40% miss rate (mechanical issue)
          if(route === 'CX-7832' && Math.random() < 0.4){
            isMiss = true;
            l0 = 'Sortation';
            l1 = 'Late to Divert';
            bucket = 'Late to Divert - Equipment Jam';
            missQty = '1';
          }
          // After jsmith42's bad config on 3/15, CX-4521 gets missorted to F22
          else if(route === 'CX-4521' && day === '2024-03-15' && shift === 'Night' && Math.random() < 0.6){
            isMiss = true;
            l0 = 'Sortation';
            l1 = 'Chute Missort';
            bucket = 'Chute Missort - Config Error';
            chute = 'F22';
            missQty = '1';
          }
          // CX-4521 still bad on 3/16 until config fixed mid-day
          else if(route === 'CX-4521' && day === '2024-03-16' && shift === 'Day' && hour < 10 && Math.random() < 0.5){
            isMiss = true;
            l0 = 'Sortation';
            l1 = 'Chute Missort';
            bucket = 'Chute Missort - Config Error';
            chute = 'F22';
            missQty = '1';
          }
          // Night shift has more late-to-SLAM issues (staffing)
          else if(shift === 'Night' && Math.random() < 0.15){
            isMiss = true;
            l0 = 'Sortation';
            l1 = 'Late to SLAM';
            bucket = 'Late to SLAM - Staffing Gap';
            missQty = '1';
          }
          // General low-level missort noise
          else if(Math.random() < 0.05){
            isMiss = true;
            l0 = 'Sortation';
            l1 = 'FC Missort';
            bucket = 'FC Missort - Wrong Route';
            missQty = '1';
          }

          rows.push({
            barcode:'TBA9328475'+String(id).padStart(5,'0'),
            slamDate:time,
            route:route,
            shift:shift,
            lastChute:chute,
            l0:l0,
            l1:l1,
            deaBucket:bucket,
            cptTime:day+' '+(shift==='Day'?'10:00:00':'22:00:00'),
            deaMissQty:missQty
          });
        }
      });
    });
  });
  return rows;
})();


// ALARMS: F18 has 45 jams (mechanical issue), others have 3-8 each
// F18 avg duration: 120s (others: 30-50s) - CLEAR mechanical problem
DEMO_DATA.alarms = (function(){
  var rows = [];
  var days = ['2024-03-15','2024-03-16','2024-03-17','2024-03-18','2024-03-19'];
  
  days.forEach(function(day){
    // F18: 9 jams per day, high duration (MECHANICAL FAILURE pattern)
    for(var i=0; i<9; i++){
      var hour = 6 + Math.floor(i*2);
      var min = Math.floor(Math.random()*59);
      var duration = 90 + Math.floor(Math.random()*120); // 90-210 seconds!
      rows.push({
        time: new Date(day+'T'+String(hour).padStart(2,'0')+':'+String(min).padStart(2,'0')+':00'),
        duration: duration,
        chute: 'F18',
        description: 'CHUTE 18 PHOTO BLOCKED - DIVERTER ARM STUCK',
        area: 'Zone B'
      });
    }
    // F12: 2 jams per day (normal wear)
    for(var j=0; j<2; j++){
      rows.push({
        time: new Date(day+'T'+String(7+j*4).padStart(2,'0')+':'+String(Math.floor(Math.random()*59)).padStart(2,'0')+':00'),
        duration: 25 + Math.floor(Math.random()*30),
        chute: 'F12',
        description: 'CHUTE 12 PHOTO BLOCKED - PACKAGE JAM',
        area: 'Zone A'
      });
    }
    // F22: 2 jams per day
    for(var k=0; k<2; k++){
      rows.push({
        time: new Date(day+'T'+String(8+k*5).padStart(2,'0')+':'+String(Math.floor(Math.random()*59)).padStart(2,'0')+':00'),
        duration: 30 + Math.floor(Math.random()*25),
        chute: 'F22',
        description: 'CHUTE 22 PHOTO BLOCKED - OVERSIZED PACKAGE',
        area: 'Zone A'
      });
    }
    // IND01: 1 jam per day
    rows.push({
      time: new Date(day+'T09:'+String(Math.floor(Math.random()*59)).padStart(2,'0')+':00'),
      duration: 40 + Math.floor(Math.random()*20),
      chute: 'IND01',
      description: 'IND01 PHOTO BLOCKED - INDUCT BACKUP',
      area: 'Zone A'
    });
    // F05: 1 jam per day
    rows.push({
      time: new Date(day+'T11:'+String(Math.floor(Math.random()*59)).padStart(2,'0')+':00'),
      duration: 35 + Math.floor(Math.random()*20),
      chute: 'F05',
      description: 'CHUTE 05 PHOTO BLOCKED - PACKAGE JAM',
      area: 'Zone C'
    });
    // F62: 1 jam per day (overflow)
    rows.push({
      time: new Date(day+'T14:'+String(Math.floor(Math.random()*59)).padStart(2,'0')+':00'),
      duration: 60 + Math.floor(Math.random()*30),
      chute: 'F62',
      description: 'CHUTE 62 PHOTO BLOCKED - CHUTE FULL OVERFLOW',
      area: 'Zone B'
    });
  });
  return rows;
})();


// EQUIPMENT: jsmith42 made 3 BAD config changes on 3/15 evening that broke CX-4521 routing
// Pattern: System auto-changes are fine, jsmith42's manual changes caused missorts
DEMO_DATA.equip = (function(){
  var rows = [];
  var days = ['2024-03-15','2024-03-16','2024-03-17','2024-03-18','2024-03-19'];
  
  // === THE BAD CHANGES by jsmith42 on 3/15 evening ===
  rows.push({dt:new Date('2024-03-15T17:30:00'),userId:'jsmith42',changeMade:'Chute F12 destination changed to F22 (WRONG - broke CX-4521)',typeOfChange:'Divert Destination',current:'F22',previous:'F12',isSystem:false});
  rows.push({dt:new Date('2024-03-15T17:32:00'),userId:'jsmith42',changeMade:'Route CX-4521 reassigned from F12 to F22',typeOfChange:'Divert Destination',current:'CX-4521 -> F22',previous:'CX-4521 -> F12',isSystem:false});
  rows.push({dt:new Date('2024-03-15T17:35:00'),userId:'jsmith42',changeMade:'Chute F22 weight limit increased to 50lbs',typeOfChange:'Chute Config',current:'50 lbs',previous:'30 lbs',isSystem:false});
  
  // === FIX by mwilson7 on 3/16 morning ===
  rows.push({dt:new Date('2024-03-16T09:45:00'),userId:'mwilson7',changeMade:'REVERTED: Route CX-4521 back to F12 (fixing jsmith42 error)',typeOfChange:'Divert Destination',current:'CX-4521 -> F12',previous:'CX-4521 -> F22',isSystem:false});
  rows.push({dt:new Date('2024-03-16T09:47:00'),userId:'mwilson7',changeMade:'REVERTED: Chute F22 weight limit back to 30lbs',typeOfChange:'Chute Config',current:'30 lbs',previous:'50 lbs',isSystem:false});

  // Normal system auto-changes across all days
  days.forEach(function(day){
    // HULK auto-balance (system - good)
    rows.push({dt:new Date(day+'T06:30:00'),userId:'HULK_SYSTEM',changeMade:'Auto-balance chute F12 load',typeOfChange:'Load Balance',current:'Active',previous:'Paused',isSystem:true});
    rows.push({dt:new Date(day+'T06:35:00'),userId:'FLOCO_AUTO',changeMade:'Belt speed adjustment - conveyor 3',typeOfChange:'Belt Speed',current:'High',previous:'Medium',isSystem:true});
    rows.push({dt:new Date(day+'T12:00:00'),userId:'HULK_SYSTEM',changeMade:'Auto-balance chute F18 load',typeOfChange:'Load Balance',current:'Active',previous:'Idle',isSystem:true});
    rows.push({dt:new Date(day+'T14:00:00'),userId:'FLOCO_AUTO',changeMade:'Chute F62 overflow threshold updated',typeOfChange:'Load Threshold',current:'80%',previous:'85%',isSystem:true});
    rows.push({dt:new Date(day+'T18:00:00'),userId:'HULK_SYSTEM',changeMade:'Night shift auto-rebalance all zones',typeOfChange:'Load Balance',current:'Night Mode',previous:'Day Mode',isSystem:true});
  });

  // Other human changes (normal operations)
  rows.push({dt:new Date('2024-03-15T08:00:00'),userId:'mwilson7',changeMade:'Chute F09 reopened after jam clear',typeOfChange:'Chute Status',current:'Open',previous:'Closed',isSystem:false});
  rows.push({dt:new Date('2024-03-16T07:15:00'),userId:'dpark23',changeMade:'Induct 1 speed reduced for safety',typeOfChange:'Belt Speed',current:'Low',previous:'Medium',isSystem:false});
  rows.push({dt:new Date('2024-03-17T08:30:00'),userId:'mwilson7',changeMade:'F18 closed for maintenance (diverter repair)',typeOfChange:'Chute Status',current:'Closed',previous:'Open',isSystem:false});
  rows.push({dt:new Date('2024-03-17T10:00:00'),userId:'mwilson7',changeMade:'F18 reopened after diverter repair',typeOfChange:'Chute Status',current:'Open',previous:'Closed',isSystem:false});
  rows.push({dt:new Date('2024-03-18T06:45:00'),userId:'dpark23',changeMade:'Chute F31 destination updated',typeOfChange:'Divert Destination',current:'CX-5566',previous:'CX-8877',isSystem:false});
  rows.push({dt:new Date('2024-03-19T07:00:00'),userId:'dpark23',changeMade:'Emergency stop cleared Zone B',typeOfChange:'Zone Status',current:'Running',previous:'E-Stop',isSystem:false});

  // jsmith42 other changes (showing pattern of carelessness)
  rows.push({dt:new Date('2024-03-17T17:00:00'),userId:'jsmith42',changeMade:'Chute F27 destination changed',typeOfChange:'Divert Destination',current:'CX-8877',previous:'CX-2211',isSystem:false});
  rows.push({dt:new Date('2024-03-18T17:15:00'),userId:'jsmith42',changeMade:'Chute F05 weight limit changed',typeOfChange:'Chute Config',current:'45 lbs',previous:'30 lbs',isSystem:false});
  rows.push({dt:new Date('2024-03-19T17:30:00'),userId:'jsmith42',changeMade:'Route CX-9011 chute reassigned',typeOfChange:'Divert Destination',current:'CX-9011 -> F09',previous:'CX-9011 -> F05',isSystem:false});

  return rows;
})();


// CPT: Night shift misses 3x more than Day shift
// Day shift: ~20% miss rate, Night shift: ~65% miss rate
// CX-7832 misses the most (tied to F18 jams)
DEMO_DATA.cpt = (function(){
  var rows = [];
  var lanes = ['CX-7832','CX-4521','CX-9011','CX-3344','CX-5566','CX-2211','CX-8877'];
  var days = ['2024-03-15','2024-03-16','2024-03-17','2024-03-18','2024-03-19'];
  var missBuckets = ['Late to Divert','Late to SLAM','FC Missort','Chute Missort','Late to Close'];
  
  days.forEach(function(day){
    lanes.forEach(function(lane){
      // DAY SHIFT - mostly good (80% on time)
      var dayBucket = 'Good';
      if(lane === 'CX-7832' && Math.random() < 0.5){
        dayBucket = 'Late to Divert'; // F18 jams cause this
      } else if(Math.random() < 0.15){
        dayBucket = missBuckets[Math.floor(Math.random()*missBuckets.length)];
      }
      rows.push({lane:lane,shift:'Day',date:day,cptTime:'10:00',bucket:dayBucket,location:lane==='CX-7832'?'F18':'F'+Math.floor(Math.random()*30+1)});

      // NIGHT SHIFT - terrible (65% miss rate)
      var nightBucket = 'Good';
      if(lane === 'CX-7832'){
        nightBucket = 'Late to Divert'; // Almost always misses
      } else if(Math.random() < 0.6){
        // Night shift has staffing issues
        var r = Math.random();
        if(r < 0.4) nightBucket = 'Late to SLAM';
        else if(r < 0.7) nightBucket = 'Late to Close';
        else nightBucket = 'FC Missort';
      }
      rows.push({lane:lane,shift:'Night',date:day,cptTime:'22:00',bucket:nightBucket,location:lane==='CX-7832'?'F18':'F'+Math.floor(Math.random()*30+1)});
    });
  });
  return rows;
})();


// PACKAGES/MISSORTS: 80 missorted packages
// KEY PATTERN: F62 receives packages from F54, F55, F53 (physical overflow)
// Also shows: F22 received CX-4521 packages due to jsmith42's bad config
DEMO_DATA.packages = (function(){
  var rows = [];
  var id = 500;
  var days = ['2024-03-15','2024-03-16','2024-03-17','2024-03-18','2024-03-19'];

  days.forEach(function(day){
    // F62 overflow pattern: 6 packages per day from nearby chutes
    // These should have gone to F54, F55, F53 but overflowed to F62
    for(var i=0; i<6; i++){
      id++;
      var sourceChute = ['F54','F55','F53','F54','F55','F53'][i];
      var sourceRoute = ['CX-3344','CX-5566','CX-2211','CX-8877','CX-9011','CX-4521'][i];
      rows.push({
        barcode:'TBA4001122'+String(id).padStart(5,'0'),
        slamDate:day,
        route:sourceRoute,
        lastChute:'F62',
        l0:'Chute Missort',
        l1:'Physical Overshoot',
        l2:'Package overshot '+sourceChute+' and landed in F62 (belt position overflow)'
      });
    }

    // F18 jam-related missorts: 4 per day (packages recirculate due to jam)
    for(var j=0; j<4; j++){
      id++;
      rows.push({
        barcode:'TBA4001122'+String(id).padStart(5,'0'),
        slamDate:day,
        route:'CX-7832',
        lastChute:'F18',
        l0:'Late to Divert',
        l1:'Equipment Jam',
        l2:'F18 diverter arm stuck - package recirculated (MECHANICAL ISSUE)'
      });
    }

    // jsmith42 config error missorts (3/15 night and 3/16 morning only)
    if(day === '2024-03-15' || day === '2024-03-16'){
      for(var k=0; k<4; k++){
        id++;
        rows.push({
          barcode:'TBA4001122'+String(id).padStart(5,'0'),
          slamDate:day,
          route:'CX-4521',
          lastChute:'F22',
          l0:'Chute Missort',
          l1:'Configuration Error',
          l2:'Route CX-4521 incorrectly mapped to F22 by jsmith42 (should be F12)'
        });
      }
    }

    // Random other missorts (2 per day)
    rows.push({
      barcode:'TBA4001122'+String(++id).padStart(5,'0'),
      slamDate:day,
      route:'CX-9011',
      lastChute:'F05',
      l0:'Late to SLAM',
      l1:'Staffing Gap',
      l2:'Night shift understaffed - package processed after SLAM cutoff'
    });
    rows.push({
      barcode:'TBA4001122'+String(++id).padStart(5,'0'),
      slamDate:day,
      route:'CX-3344',
      lastChute:'F09',
      l0:'FC Missort',
      l1:'Wrong Route',
      l2:'Stale routing table - upstream FC label error'
    });
  });
  return rows;
})();
