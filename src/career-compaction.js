/* Explicit, device-local career compaction transaction. Never contacts cloud storage. */
(function(g){'use strict';
const Archive=g.TLCareerArchive,BACKUP_KIND='touchline-manager-compaction-backup',VERSION=1;
const copy=value=>JSON.parse(JSON.stringify(value));
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';return JSON.stringify(value);}
function requireStore(store,name){if(!store||typeof store.get!=='function'||typeof store.set!=='function')throw Error(`${name} must provide get and set.`);}
async function commitLocal({source,reviewedCandidate,verifiedArchive,validateCheckpoint,backupStore,careerStore,makeBackup,confirmReplaceBackup=async()=>false}){
 if(!Archive)throw Error('Career archive services are not available.');requireStore(backupStore,'Recovery backup store');requireStore(careerStore,'Career store');if(typeof validateCheckpoint!=='function')throw Error('A checkpoint validator is required before replacement.');if(typeof makeBackup!=='function')throw Error('A full recovery backup is required before replacement.');
 const sourceText=JSON.stringify(source);if(!sourceText)throw Error('The source career cannot be copied safely.');const sourceCopy=JSON.parse(sourceText);
 const verified=await Archive.verifyCompleteArchive(sourceCopy,verifiedArchive);if(verified.careerId!==sourceCopy.id)throw Error('The selected season archive belongs to another career.');
 const dry=await Archive.dryRunCompact(sourceCopy,validateCheckpoint,verifiedArchive);if(reviewedCandidate&&stable(dry.candidate)!==stable(reviewedCandidate))throw Error('The candidate changed since review. Run the dry-run review again.');
 const candidateText=JSON.stringify(dry.candidate),currentText=careerStore.get();if(currentText!==sourceText)throw Error('The saved career changed since review. Nothing was replaced.');if(JSON.stringify(source)!==sourceText)throw Error('The active career changed during verification. Nothing was replaced.');
 const previousBackup=backupStore.get();if(previousBackup&&!await confirmReplaceBackup())throw Error('The existing recovery backup was kept; no career data was replaced.');
 if(careerStore.get()!==sourceText||JSON.stringify(source)!==sourceText)throw Error('The career changed before replacement. Nothing was replaced.');
 const backupValue=makeBackup(sourceCopy),backupText=typeof backupValue==='string'?backupValue:JSON.stringify(backupValue);if(!backupText)throw Error('The full recovery backup could not be serialized.');
 try{backupStore.set(backupText);}catch(error){throw Error(`The full recovery backup could not be written; the career was not replaced. ${error.message}`);}
 if(backupStore.get()!==backupText){if(previousBackup!==null&&previousBackup!==undefined)try{backupStore.set(previousBackup);}catch{}throw Error('The full recovery backup did not verify; the career was not replaced.');}
 const restoreSource=()=>{careerStore.set(sourceText);if(careerStore.get()!==sourceText)throw Error('The candidate write failed and automatic rollback could not be verified. The verified recovery backup is retained.');};
 try{careerStore.set(candidateText);if(careerStore.get()!==candidateText)throw Error('The candidate did not verify.');}catch(error){try{restoreSource();}catch(rollback){throw Error(`${error.message} Automatic rollback failed: ${rollback.message}`);}if(/candidate did not verify/i.test(error.message))throw Error('The candidate did not verify; the original career was restored from the verified recovery backup.');throw error;}
 if(JSON.stringify(source)!==sourceText){try{restoreSource();}catch(rollback){throw Error(`The active career changed and rollback failed: ${rollback.message}`);}throw Error('The active career changed during replacement; the original was restored.');}
 return{career:JSON.parse(careerStore.get()),backup:JSON.parse(backupStore.get()),archiveId:verified.archiveId,compactedYears:dry.compactedYears,removedResultRows:dry.removedResultRows,beforeBytes:dry.beforeBytes,afterBytes:dry.afterBytes,savedBytes:dry.savedBytes,archiveBytes:dry.archiveBytes};
}
const api={VERSION,BACKUP_KIND,commitLocal};g.TLCareerCompaction=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
