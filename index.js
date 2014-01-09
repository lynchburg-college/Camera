
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



var showRoomInfo=function() {
  
  config = $.ajax({
        type: "GET",
        url: "config-machine",
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

            item=$('<div/>', { id: 'media-'+k, title: k, text:k } );

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




var showSchedule=function() {

   response=send('show schedule');
   vlcStatus = eval( "("+response+")" );

   events=[];
   $.each( (vlcStatus.result.schedule || {}), function(k,v) {
                                                              if ( v['next launch'] ) {

                                                                 eventInfo=k.split("-");
                                                                 eventName=eventInfo[1];
                                                                 eventDate=v['next launch'];

                                                                 events.push( { 
                                                                                title : eventInfo[1]+' ('+eventInfo[2]+')',
                                                                                start : eventDate,
                                                                                allDay : false
                                                                               });
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
   var width='640';
   var height='480';

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
                  showSchedule();

                  $("#content").tabs();
               }
 );




