
jQuery.fn.exists=function(){ return this.length>0;}



var send = function(cmd,update) {

  console.log("Sending "+cmd);
  
  url="cmd.xml?command="+encodeURIComponent(cmd);
  response = $.ajax({
        type: "GET",
        url: url,
        async: false,
    }).responseText;

  console.log(response);
  if(update) {
  console.log('callback');
  setTimeout( update, 3000);
}

  return(response);
}


var roomID;
var roomName;

var showRoomInfo=function() {
  
  config = $.ajax({
        type: "GET",
        url: "config-machine",
        async: false,
    }).responseText;

  match=config.match(/room=(.*)/);
  if( match!= null ) { roomID=match[1]; $("#room").text( roomID );document.title=roomID; };

  match=config.match(/roomName=(.*)/);
  if( match!= null ) { roomName=match[1]; $("#roomName").text( roomName ) };
 

}

var toggleMedia=function(m) {
}


var showMedia=function() {

   response=send('show media');
   vlcStatus = eval( "("+response+")" );
 
   $(".fa-inverse").removeClass("fa-inverse");
   $("#status-media-timestamp").html( ' as of ' + vlcStatus.timestamp);
   
   items='';
   $.each( ( vlcStatus.result.media || {} ), 
   function(k,v) {

          name=k;
          output=v.output;
    
          item=$('#media-'+k);
          console.log( item );
    
          if( !item.exists() ) {

            item=$('<button/>', { id: 'media-'+k, title: k, text:k } );

            controls=$('<span/>').addClass('controls');      

            buttonStop=$('<i/>').addClass('fa fa-stop').click(function(){ send('control ' + k + ' stop', showMedia)}).appendTo(controls);
            buttonPlay=$('<i/>').addClass('fa fa-play').click(function(){ send('control ' + k + ' play', showMedia)}).appendTo(controls);

            controls.appendTo(item);
            
            item.appendTo('#status-media');
          };

          if ( v['instances'] ) {
            m='#media-'+k+' .controls i.fa-play';
            $(m).addClass("fa-inverse");
          }

    });


};



var reloadSchedule=function( confirmed ) {

 if(!confirmed){
   $("<div>This will reload all schedules from the academic data source.  Ad-hoc schedules will be lost.<br>Continue?</div>")
   .dialog({
                appendTo : "body",
                resizable: false,
                height:240,
                modal:true,
                title : "Reload Entire Schedule",
                buttons: { 
                              Cancel :  function() { $(this).dialog("close"); } ,
                             'Reload':  function() { $(this).dialog("close");reloadSchedule(true); }
                         },
           })
   .dialog( "open" );
   return;
 }  

 // Go get the schedule from the academic source
 roomID='SHWL232';
 url="http://apps.lynchburg.edu/campus/system/public/calendar/roominfo.asp?room="+roomID;

 scheduleSource = $.ajax({
        type: "GET",
        url: url,
        async: false,
 }).responseText;

 $.each( scheduleSource.split('\n'), function(k,line) {
                                        send( line );
                                     });
                                     

 send("save config-schedule");

 showSchedule();
 
   
 

}


var showSchedule=function() {

   response=send('show schedule');
   vlcStatus = eval( "("+response+")" );

   events=[];
   $.each( (vlcStatus.result.schedule || {}), function(k,v) {
                                                              if ( v['next launch'] ) {

                                                                 eventInfo=k.split("-");

                                                                 eventName=eventInfo[1];
                                                                 eventType=eventInfo[2];
                                                                 eventDate=v['next launch'];

                                                                 eventInfo=(eventType=='start')?' - ' + eventName:'';
                                                                 eventColor=(eventType=='start')?'#04B45F':'#3B0B0B';

                                                                 events.push( { 
                                                                                title : eventType + eventInfo,
                                                                                start : eventDate,
                                                                                allDay : false,
                                                                                color  : eventColor
                                                                               });
                                                              }                                           
                                                           }
        );
                                                           

   $("#status-schedule").fullCalendar( 'removeEvents' );
   $("#status-schedule").fullCalendar( { events: events } );
      
 
}




var showPreview=function() {

   var url='http://'+window.location.hostname+':8990/camera';
   var width='640';
   var height='480';

   template =  '<object type="application/x-vlc-plugin" data="$url" width="$width" height="$height" id="preview" controls="yes">' +
               ' <param name="movie" value="$url"/>' + 
               ' <embed type="application/x-vlc-plugin" name="preview"  autoplay="yes"  loop="no" width="$width" height="$height"  target="$url" />' + 
              '</object>';

   template=template.replace("$url", url);
   template=template.replace("$width", width);
   template=template.replace("$height", height);

   $("#status-preview").html(  template );

 }




 var showIcon=function(icon) {
 
   var link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = './'+icon;
    document.getElementsByTagName('head')[0].appendChild(link);
}





 $( function() {  
   
                  $("#add-schedule-button").button().click( function(e){ e.preventDefault;$("#add-schedule-dialog").dialog("open") } );
                  $("#reload-schedule-button").button().click( function(e){ e.preventDefault;reloadSchedule();} );
                  $("#add-schedule-dialog").dialog({
                    modal: true,
                    autoOpen : false
                  });

                  showRoomInfo();
                  showMedia();
                  showSchedule();

                  $("#content").tabs();
               }
 );




