

var send = function(cmd,update) {

//  console.log("Sending "+cmd);
  
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



var icons={
             'idle'     : 'fa-gear',
             'active'   : 'fa-gear fa-spin',
             'media'    : 'fa-gear',
             'schedule' : 'fa-tasks',
             'media-camera'   : 'fa-camera',
             'media-recorder' : 'fa-users',
             'media-preview'  : 'fa-picture-o'
           };

var getIcon=function(i) {
  return ( icons[i] || 'fa-gear' );
}


var showRoomInfo=function() {
  
  config = $.ajax({
        type: "GET",
        url: "config-settings",
        async: false,
    }).responseText;

  match=config.match(/room=(.*)/);
  if( match!= null ) { $("#room").text( match[1] );document.title=match[1]; };

  match=config.match(/roomName=(.*)/);
  if( match!= null ) { $("#roomName").text( match[1] ) };
 

}


var showMedia=function() {

   response=send('show media');
   vlcStatus = eval( "("+response+")" );
   
   items='';
   $.each( ( vlcStatus.result.media || {} ), function(k,v) {

          name=k;
          output=v.output;
    
          if ( v['instances'] ) {
            state = "active";
            actionIcon='fa-stop';
            actionCommand='control '+k+' stop';
            actionTitle="Stop";
          }
         else {
            state="idle";
            actionIcon='fa-play';
            actionCommand='control '+k+' play';
            actionTitle="Start";
         }

          icon='<span class="fa '+getIcon('media-'+name)+' "></span>';

          action='<span class="link fa '+actionIcon+'" title="'+actionTitle+'" onClick="send(\''+actionCommand+'\', showMedia);"></span>';

          status='<span class="fa ' +getIcon(state)+'"></span>';

          items=items+'<tr class="item">' + 
                              '<td>' + icon + '</td>' + 
                              '<td>' + name + '</td>' +
                              '<td>' + action + '  ' + status + '</td> ' +
                      '</tr>';
    });

   $("#status-media").html( '<i> '+vlcStatus.timestamp+'</i><hr><table>'+items+'</table>');

};




var showSchedule=function() {

   response=send('show schedule');
   vlcStatus = eval( "("+response+")" );

   events=[];
   $.each( (vlcStatus.result.schedule || {}), function(k,v) {
                                                              if ( v['next launch'] ) {
                                                                 eventInfo=k.split("-");
                                                                 eventDate=v['next launch'];
                                                                 events.push( { 
                                                                                title : eventInfo[1]+' ('+eventInfo[2]+')',
                                                                                start : eventDate,
                                                                                allDay : false
                                                                               } );
                                                              }                                           
                                                           }
        );
                                                            
    calendarOptions={
                      events:events,
                      timeFormat: 'h(:mm)t - ',
                      height: 800,
                      title:'Scheduled Recordings',
                      
                    };

   $("#status-schedule").fullCalendar( calendarOptions );
   

   
 
}


 var showPreview=function() {

   var url='http://'+window.location.hostname+':8990/camera';
   var width='1024';
   var height='576';

   template =  '<object type="application/x-vlc-plugin" data="$url" width="$width" height="$height" id="preview">' +
               ' <param name="movie" value="$url"/>' + 
               ' <embed type="application/x-vlc-plugin" name="preview"  autoplay="yes" loop="no" width="$width" height="$height"  target="$url" />' + 
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
   
                  showRoomInfo();
                  showMedia();
                  window.setInterval( function(){ showMedia() }, 60000 );
                  showSchedule();

                  $("#content").tabs();
               }
 );




