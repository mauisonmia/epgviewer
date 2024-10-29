class XMLEPG{constructor(){this.xmlDoc=null;this.channels=null;this.programs=null;this.earliestStartDate=null;this.latestStopDate=null;this.timelineLength=null;this.timelineBlockDuration=30;this.oneUnit=5;this.timelineTimer=null;this.epgContainer=null;this.overlayContainer=null;this.playlistChannels=null;this.urls=null}
async setPlaylistChannels(playlistChannels){this.playlistChannels=playlistChannels}
async load(urls){if(urls==null||urls.length==0)
return;this.urls=urls;await this.loadXML(urls);await this.getChannels();await this.getPrograms();await this.sortAndCombine()}
async loadXML(urls){try{const combinedXMLDoc=document.implementation.createDocument(null,'CombinedEPG',null);for(const url of urls){const response=await fetch(url);if(!response.ok){throw new Error(`Network response was not ok for URL: ${url}`)}
let xmlText=await response.text();xmlText=xmlText.replace(/&(?!(?:apos|quot|[gl]t|amp);)/g,'&amp;');const xmlDoc=new DOMParser().parseFromString(xmlText,'application/xml');if(xmlDoc.getElementsByTagName('parsererror').length>0){const serializer=new XMLSerializer();const xmlString=serializer.serializeToString(xmlDoc);console.error('Parsed XML with errors:',xmlString);throw new Error('Error parsing XML')}
const children=xmlDoc.documentElement.children;for(let i=0;i<children.length;i++){combinedXMLDoc.documentElement.appendChild(combinedXMLDoc.importNode(children[i],!0))}}
this.xmlDoc=combinedXMLDoc}catch(error){console.error('Failed to fetch or parse XML:',error)}}
async getChannels(){const channels=this.xmlDoc.querySelectorAll('channel');const channelList=[];channels.forEach(channel=>{const tvgId=channel.getAttribute('id');const displayName=channel.querySelector('display-name');const channelName=displayName?displayName.textContent:'No channel name found';const iconElement=channel.querySelector('icon');const tvgLogo=iconElement?iconElement.getAttribute('src'):'default_tvgLogo.png';channelList.push({tvgId,channelName,tvgLogo})});this.channels=channelList}
getChanneltvgLogo(tvgId){const channel=this.channels.find(channel=>channel.tvgId===tvgId);return channel?channel.tvgLogo:null}
async getPrograms(){const programs=this.xmlDoc.querySelectorAll('programme');const programList=[];programs.forEach(prog=>{const titleElement=prog.querySelector('title');const title=titleElement?titleElement.textContent:'No title found';const start=prog.getAttribute('start');const stop=prog.getAttribute('stop');const tvgId=prog.getAttribute('channel');const descElement=prog.querySelector('desc');const iconElement=prog.querySelector('icon');const startDate=new Date(this.parseDate(start));const stopDate=new Date(this.parseDate(stop));const formattedStartTime=this.getDayAndTime(startDate);const duration=this.getDurationInMinutes(startDate,stopDate);const desc=descElement?descElement.textContent:'No description';const icon=iconElement?iconElement.getAttribute('src'):this.getChanneltvgLogo(tvgId);programList.push({tvgId,title,desc,icon,startDate,stopDate,formattedStartTime,duration})});this.programs=programList}
async sortAndCombine(){if(this.playlistChannels){this.playlistChannels.forEach(channel=>{let match=this.findBestMatchingChannel(channel);var programs=null;if(match){programs=this.programs.filter(prog=>prog.tvgId===match.tvgId);programs.sort((a,b)=>a.startDate-b.startDate);programs=programs.filter((program,index,self)=>{return index===0||program.startDate!==self[index-1].startDate})}
channel.programList=programs});this.channels=this.playlistChannels;delete this.playlistChannels}else{this.channels.forEach(channel=>{var programs=this.programs.filter(prog=>prog.tvgId===channel.tvgId);if(programs.length==0){programs=null}else{programs.sort((a,b)=>a.startDate-b.startDate);programs=programs.filter((program,index,self)=>{return index===0||program.startDate!==self[index-1].startDate})}
channel.programList=programs})}
let allPrograms=this.channels.map(item=>item.programList).flat();allPrograms=allPrograms.filter(program=>program&&program.startDate);this.earliestStartDate=this.getEarliestDate(allPrograms).startDate;this.latestStopDate=this.getLatestStopDate(allPrograms).stopDate;this.timelineLength=this.getDurationInMinutes(this.earliestStartDate,this.latestStopDate);delete this.programs}
async setTimelineNeedle(){var currentRedLinePosition=200+(this.getDurationInMinutes(this.earliestStartDate,new Date())*this.oneUnit);const redLine=document.getElementById('vertical-red-line');redLine.style.left=`${currentRedLinePosition}px`;const fullPageHeight=this.epgContainer.scrollHeight;redLine.style.height=`${fullPageHeight}px`;const currentTime=new Date();const elements=document.querySelectorAll('.cell');elements.forEach(el=>{el.style.backgroundColor='';el.classList.remove('now')});elements.forEach(el=>{const startDate=new Date(el.getAttribute('start'));const stopDate=new Date(el.getAttribute('stop'));if(currentTime>=startDate&&currentTime<stopDate){el.classList.add('now');el.style.backgroundColor='#5a93a3'}})}
convert24to12(time){let[hours,minutes]=time.split(':');hours=parseInt(hours,10)+8;if(hours>=24){hours-=24}
const period=hours>=12?'PM':'AM';hours=hours%12||12;return'${hours}:${minutes} ${period}'}
getMinutesSinceEarliestStartDate(earliestStartDate,date){if(!date){date=new Date()}
const diffInMs=date-earliestStartDate;const minutes=Math.floor(diffInMs/(1000*60));return minutes}
getDurationInMinutes(date1,date2){let differenceInMs=Math.abs(date2-date1);let differenceInMinutes=Math.floor(differenceInMs/(1000*60));return differenceInMinutes}
parseDate(dateString){const year=dateString.substring(0,4);const month=dateString.substring(4,6)-1;const day=dateString.substring(6,8);const hour=dateString.substring(8,10);const minute=dateString.substring(10,12);const second=dateString.substring(12,14);const timezone=dateString.substring(15,18)+':'+dateString.substring(18,20);const formattedDateString=`${year}-${month + 1}-${day}T${hour}:${minute}:${second}${timezone}`;return new Date(formattedDateString)}
getEarliestDate(programs){return programs.reduce((earliest,current)=>{const currentStartDate=new Date(current.startDate);const earliestStartDate=new Date(earliest.startDate);return currentStartDate<earliestStartDate?current:earliest})}
getLatestStopDate(programs){return programs.reduce((latest,current)=>{const currentStopDate=new Date(current.stopDate);const latestStopDate=new Date(latest.stopDate);return currentStopDate>latestStopDate?current:latest})}
displayDetails(event,channelIndex,programIndex){const program=this.channels[channelIndex].programList[programIndex];const title=program.title;const desc=program.desc;const formattedStartTime=program.formattedStartTime;tooltip.querySelector('h2').textContent=title;tooltip.querySelector('p').textContent=desc;tooltip.querySelector('div:nth-child(2)').textContent=formattedStartTime;const scrollLeft=this.epgContainer.scrollLeft;const scrollTop=this.epgContainer.scrollTop;tooltip.style.display='block';tooltip.style.left=`${scrollLeft + event.pageX + 10}px`;tooltip.style.top=`${scrollTop + event.pageY + 10}px`}
hideTooltip(){const tooltip=document.getElementById('tooltip');if(tooltip){tooltip.style.display='none'}}
setOneUnit(oneUnit){if(oneUnit>0){this.oneUnit=oneUnit}}
normalizeChannelName(channelName){return channelName.toLowerCase().replace(/\s*\(?4k\)?\s*|\s*\(?hd\)?\s*/g,'')}
findBestMatchingChannel(playlistChannel){let match=this.channels.find(channel=>channel.tvgId==playlistChannel.tvgId);const normalizedPlaylistName=this.normalizeChannelName(playlistChannel.channelName);if(!match){match=this.channels.find(channel=>this.normalizeChannelName(channel.channelName).includes(normalizedPlaylistName));if(!match){match=this.channels.find(channel=>{const normalizedChannelName=this.normalizeChannelName(channel.channelName);return normalizedPlaylistName.replace('channel','ch').includes(normalizedChannelName.replace('channel','ch'))})}}
return match||null}
close(){clearInterval(this.timelineTimer);this.epgContainer.style.display='none'}
getDayAndTime(date){const daysOfWeek=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const dayOfWeek=daysOfWeek[date.getDay()];const options={hour:'2-digit',minute:'2-digit',hour12:!0};const formattedTime=date.toLocaleTimeString([],options);return `${dayOfWeek} ${formattedTime}`}
getDayAndTimeOfNextBlock(date,num){let mydate=new Date(date);mydate.setMinutes(mydate.getMinutes()+(this.timelineBlockDuration*num));const daysOfWeek=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const dayOfWeek=daysOfWeek[mydate.getDay()];const options={hour:'2-digit',minute:'2-digit',hour12:!0};const formattedTime=mydate.toLocaleTimeString([],options);return `${dayOfWeek} ${formattedTime}`}
async displayAllPrograms(containerId,xmlepgInstanceName){if(this.urls==null||this.urls.length==0){if(this.playlistChannels&&this.channels==null){this.channels=this.playlistChannels;delete this.playlistChannels}
return}
this.epgContainer=document.getElementById(containerId);const container=this.epgContainer;let sb=new StringBuilder();let allPrograms=this.channels.map(item=>item.programList).flat();var earliestStartDate=this.earliestStartDate;var latestStopDate=this.latestStopDate;const timelineLength=this.timelineLength;const oneUnitWidth=this.oneUnit*this.timelineBlockDuration;sb.append('<div id="vertical-red-line-container">');sb.append(`<div class="table"><div class="thead"><div class="row"><div class="cell channelBox pinned-timeline">github.com/dbghelp</div>`);const numOfBlocks=timelineLength/this.timelineBlockDuration;for(let i=0;i<numOfBlocks;++i){let daytime=this.getDayAndTimeOfNextBlock(earliestStartDate,i);let day=daytime.substring(0,3);let time=daytime.substring(3);sb.append(`<div class="cell pinned-timeline" style="width:${this.oneUnit * this.timelineBlockDuration}px;"><div class="timelineDay">${day}</div><div class="timelineTime">${time}</div></div>`)}
sb.append(`</div></div>`);var channelIndex=0;this.channels.forEach(channel=>{sb.append('<div class="row"><div class="cell pinned-channel-box channelBox">');sb.append('<span><img src="'+channel.tvgLogo+'" alt="'+channel.channelName+' tvgLogo" class="channelBoxImage" /></span>');sb.append('<br/>');sb.append('<span class="channelBoxName">'+channel.channelName+'</span>');sb.append('</div>');let programs=channel.programList;if(programs){var firstStartDate=programs[0].startDate;var firstWidth=this.oneUnit*this.getMinutesSinceEarliestStartDate(earliestStartDate,firstStartDate);if(firstWidth>0){sb.append(`<div class="cell" style="width: ${firstWidth}px"></div>`)}
var programIndex=0;programs.forEach(program=>{var width=this.oneUnit*program.duration;const startDate=program.startDate.toISOString();const stopDate=program.stopDate.toISOString();if(width>0){let icon=program.icon.replace(/'/g,"\\'").replace(/"/g,'&quot;');let title=program.title.replace(/'/g,"\\'").replace(/"/g,'&quot;');let desc=program.desc.replace(/'/g,"\\'").replace(/"/g,'&quot;');let formattedStartTime=program.formattedStartTime.replace(/'/g,"\\'").replace(/"/g,'&quot;');sb.append(`<div class="cell" style="width: ${width}px" onmouseover="${xmlepgInstanceName}.displayDetails(event, ${channelIndex}, '${programIndex}')" onmouseout="${xmlepgInstanceName}.hideTooltip()" start="${startDate}" stop="${stopDate}">`);sb.append('<div class="start-time">');sb.append(program.formattedStartTime.split(' ').slice(1).join(' '));sb.append('</div>');sb.append('<div class="program-title">‎ ');sb.append(program.title);sb.append(' </div>');sb.append('</div>')}
++programIndex})}
sb.append('</div>');++channelIndex});sb.append('</div>');sb.append('<div id="tooltip" style="display:none;position: absolute; color: #FFFFFF; background-color: #333333; padding: 10px; width: 40%; flex-direction: column; z-index: 2000"><div><h2></h2> <p></p> </div> <div style="float:right; white-space: nowrap;"></div> </div>');sb.append('<div id="vertical-red-line"></div>');sb.append('</div>');sb.append(`<button id="close-button" onclick="${xmlepgInstanceName}.close()">Close</button>`);container.innerHTML=sb.toString()}
async timelineNeedleRender(){this.setTimelineNeedle();const redLine=document.getElementById('vertical-red-line');redLine.scrollIntoView({behavior:'smooth',block:'start',inline:'center'});this.timelineTimer=setInterval(()=>{this.setTimelineNeedle()},30000)}
async clearTimelineNeedle(){clearInterval(this.timelineTimer)}
async displayPrograms(containerId,tvgId){this.overlayContainer=document.getElementById(containerId);const container=this.overlayContainer;const channel=this.channels.filter(channel=>channel.tvgId===tvgId)[0];const programs=channel.programList;if(!programs){container.innerHTML=`
				<div class="program" style="background-color: '#282c34';" id="''">
				  <img src="${channel.tvgLogo}" alt="${channel.channelName} logo">
				  <div class="program-details">
					<h2>No EPG data available</h2>
					<p>No EPG data available</p>
				  </div>
				  <div id="startTime">
				  
				  </div>
				</div>
				`;return}
container.innerHTML=programs.map(prog=>{const now=new Date();const isCurrentProgram=now>=prog.startDate&&now<=prog.stopDate;return `
        <div class="program" style="background-color: ${isCurrentProgram ? '#5a93a3' : '#282c34'};" id="${isCurrentProgram ? 'now' : ''}">
          <img src="${prog.icon}" alt="${prog.title} thumbnail">
          <div class="program-details">
            <h2>${prog.title}</h2>
            <p>${prog.desc}</p>
          </div>
		  <div id="startTime">
		  ${prog.formattedStartTime}
		  </div>
        </div>
      `}).join('');setTimeout(()=>{const nowElement=document.getElementById('now');if(nowElement){nowElement.scrollIntoView({behavior:'auto'})}},500)}}
class StringBuilder{constructor(){this.parts=[]}
append(text){this.parts.push(text);return this}
toString(){return this.parts.join('')}
clear(){this.parts=[]}}