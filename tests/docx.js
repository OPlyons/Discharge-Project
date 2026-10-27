import {inflateRawSync} from 'node:zlib';

// Read ZIP central entries so the tests cover both Word files and browser-created packs.
export function readDocxEntry(bytes, filename){
 const data=Buffer.from(bytes);let end=data.length-22;
 while(end>=0&&data.readUInt32LE(end)!==0x06054b50)end--;
 if(end<0)throw new Error('Missing ZIP directory');
 let offset=data.readUInt32LE(end+16);
 for(let i=0;i<data.readUInt16LE(end+10);i++){
  if(data.readUInt32LE(offset)!==0x02014b50)throw new Error('Invalid ZIP entry');
  const method=data.readUInt16LE(offset+10),length=data.readUInt32LE(offset+20),nameLength=data.readUInt16LE(offset+28),extraLength=data.readUInt16LE(offset+30),commentLength=data.readUInt16LE(offset+32),local=data.readUInt32LE(offset+42);
  const name=data.subarray(offset+46,offset+46+nameLength).toString();
  if(name===filename){
   const start=local+30+data.readUInt16LE(local+26)+data.readUInt16LE(local+28),compressed=data.subarray(start,start+length);
   if(method===0)return compressed.toString();
   if(method===8)return inflateRawSync(compressed).toString();
   throw new Error('Unsupported ZIP compression');
  }
  offset+=46+nameLength+extraLength+commentLength;
 }
 throw new Error('Missing Word part: '+filename);
}
