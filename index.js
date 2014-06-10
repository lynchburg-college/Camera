
jQuery.fn.exists=function(){ return this.length>0;}

jQuery.fn.redraw = function() {
    return this.hide(0, function() {
        $(this).show();
    });
};

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}

String.prototype.toObjectArray=function() {
 x=[];

 $.each( this.split("\n"), function(i,v) {

   v = v.ltrim();
   if( v.length > 1 && v.charAt(0) != "#") {
     vv=v.split("=");
     name=vv[0];
     value=vv[1]
           .replace(/\+/g," ")
           .replace(/"/g,'');

     x.push( { "name" : name, "value" : value } );
   }

 })
 return x;
}


var roomID='UNDEFINED';
var roomName='UNDEFINED';

var send = function(cmd,parms) {

//  console.log("Sending "+cmd);
   
  url="cmd.xml?command="+encodeURIComponent(cmd)+'&'+(parms||'')
//  console.log(url);

  response = $.ajax({
        type: "GET",
        url: url,
        async: false,
    }).responseText;

  return (response);
}


var loadMachine=function() {
             
              raw = $.ajax({
                    type: "GET",
                    url: "config/machine",
                    async: false,
                }).responseText;

              config=raw.toObjectArray();

              $.each( config, function(i,v) {
                $("#config-"+v['name'] ).val( v['value'] );
              });
             
              $("#roomInfo").text( $("#config-roomID").val() + ' / ' + $("#config-roomName").val() )
              document.title=$("#config-roomID").val();

}

var updateMachine=function() {

   config=$("#config-form").serializeArray();
   p='';
   $.each( config, function(i,v) { 
       p=p+v['name']+'='+v['value']+'&';
   });

   $('#command-result').html( send('update machine', p) );
   $('#command-result').html( send('update schedule', p) );
   $("#event-calendar").fullCalendar( 'refetchEvents' );
   $("#event-calendar").fullCalendar( 'rerenderEvents' );

   window.alert("Configuration and Schedule Updated.")
}



var loadControls=function() {

   response=send('show camera');
   controls=[];
   
   vlcStatus = eval( "("+response+")" );
   $.each( vlcStatus.result.split("\n") ,
           function(k,line) {

                  item=$.trim(line.split(":")[0]);
                  value=$.trim(line.split(":")[1]);


                  pluck=item.match(/\((.*)\)/);
                  if (pluck) {

                    item=$.trim(item.split('(')[0]);
                    itemType = (pluck) ? pluck[1]: '' ;
                    value='control='+item+' type='+itemType+' '+value;

                    value=value.replace(/=/g, ":\"")
                               .split(" ").join(",")
                               .replace(/,/g, "\",") + '"';

                    console.log (value) ;
                    controls.push( eval('({'+value+'})') );
                  }

           } );
           
   return controls;
}

var showControls=function( controls ) {

   $.each( controls,
           function(k,v) {

           name=v['control'];
           value=v['value'];
           control=$('#control-'+name);

           if( !control.exists() ) {

                  $('<button>', {id:'control-'+name} )
                   .html(name)
                   .button()
                   .appendTo('#list-controls');
           };

   });


}


var showVideos=function(item) {

   response=send('show media');
   vlcStatus = eval( "("+response+")" );
   
   $.each( ( vlcStatus.result), 
   function(k,v) {
     console.log(v);
   });
  
}

var toggleMedia=function( item ) {

    mediaName=$(item).attr('id').replace('media-','');
    status=send('show '+mediaName);

    action=( status.indexOf('instance') == -1 ) ? 'play' : 'stop';
    status=send('control '+mediaName+' '+action);

    $(item).button("option","label", mediaName+' (<i>stand by</i>)').button("refresh");
    window.setTimeout( 'showMedia()', 3000);

}

var showMedia=function() {

   response=send('show media');
   vlcStatus = eval( "("+response+")" );
    
   $.each( ( vlcStatus.result.media || {} ), 
   function(k,v) {

          name=k;
          output=v.output;
          isStream=(output.indexOf('http'));
          
          item=$('#media-'+name);
              
          // Create the button element if needed
          if( !item.exists() ) {

            item=$('<button/>', { id: 'media-'+name, title: name, text:name } )
                 .appendTo('#status-media')
                 .click( function() { toggleMedia( $(this) ) } )
                 .button();
         }
         item.removeClass('active');
         item.removeClass('idle');
         
         if( v['instances'] ) { 
            if( output.indexOf('http') != -1 ) { showPreview(name) };
            name=name+' (active)';
            currentClass='active';
         }
         else
         {
            name=name+' (idle)' ;
            currentClass='idle';
         };
          
         item.addClass( currentClass )
             .button("option","label", name)
             .button("refresh");
       
    });

};


var getEvents=function( calendarStart, calendarEnd,  callback ) {

   response=send('show schedule');
   vlcStatus = eval( "("+response+")" );

   var events={};
   $.each( (vlcStatus.result.schedule || {}), function(k,v) {
          if ( v['next launch'] ) {

             eventInfo=k.split("-");

             eventID=eventInfo[0];
             eventName=eventInfo[1];
             eventType=eventInfo[2];

             eventLaunch=v['next launch'].substring(0,19);

             event = ( events[eventID] );

             if(!event) {
                event={ eventID:eventID,
                        courseID:eventName,
                        title:eventName,
                        allDay:false,
                        start:eventLaunch // If creating, use the current time as the start 
                       };
             }

             if(eventType=='start') {
               event['start']=eventLaunch;
               event['hasStart']=true;
             }
             else {
               event['end']=eventLaunch; 
               event['hasEnd']=true;
             }             

             events[eventID] = event;

          }                                           

   });
                                                         
  eventsArray=[];
  $.each( events, function(k,v) {

      eventStart=new Date(v.start);
      eventEnd=new Date(v.end);
      if( !v.hasStart ) { v.title = v.title + ' / STOP' }
      if( (calendarStart <= eventStart) && ( eventEnd <= calendarEnd ) ) {
       eventsArray.push(v) 
      }

   });

  callback(eventsArray);
}


var handleDelete=function( event, confirmed ) {

 if(!confirmed) {

      courseID=event.courseID;

      content='<div id="deleteOptions">'+
                '<input type="checkbox" id="deleteSingle" value="all"><label for="deleteSingle">Remove this recording only</label>' + 
                '<input type="checkbox" id="deleteAll" value="all"><label for="deleteAll">Remove all scheduled recordings for '+courseID +'</label>' + 
              '</div>';
                
      
      $('<div>').appendTo("body")
               .html( content )
               .data( "event", event )
               .dialog({ title:'Confirm',
                          modal: true,
                          buttons: { 
                                     'Never Mind':function(){ $(this).dialog("close") } ,
                                     'Yes, Delete It':function(){ $(this).dialog("close");handleDelete( $(this).data("event"), true) } 
                                    }
                        });
 }
 else {
  console.log(event);

 }
  
}

var formatDateForSchedule=function( sourceDate ) {
  // Format = 2014/01/16-17:00:00

  d = new Date(sourceDate);
   f=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate() + ' ' + d.getHours+':'+d.getMinutes()+':'+d.getSeconds();
  return f;

}


var handleAdd=function(event) {

   event='adhoc-'+Math.round(new Date().getTime() / 1000) ;

   send('new '+event+'-start schedule');
   send('setup '+event+'-start date '+formatDateForSchedule(event.start) );
   send('setup '+event+'-start append control recorder start');
   send('setup '+event+'-start enabled');
   
   send('new '+event+'-stop schedule');
   send('setup '+event+'-stop date '+formatDateForSchedule(event.end) );
   send('setup '+event+'-stop append control recorder start');
   send('setup '+event+'-stop enabled');

   $('#event-calendar').fullCalendar('refreshEvents');
      
}


var handleHover=function( event, jsEvent, view) {

  switch (jsEvent.type) {

   case 'mouseenter' :

                     toolBar=$('<span>', { class:'hover-toolbar' } );

                     buttonDelete=$('<span>', { id:'delete-'+event.eventID, class:'fa fa-times fa-2x hover-delete' } )
                                  .data("event", event)
                                  .click( function(){ handleDelete( $(this).data("event")) } )
                                  .appendTo(toolBar);
                     
                     $('.fc-event-inner', this).append( toolBar );

                     break;
                     
   case 'mouseleave'  :
                    $('.hover-toolbar', this).remove();
                     break;
 }
 

}


var handleSelect=function( startDate, endDate, allDay, jsEvent, view ) {

       $("#event-calendar").fullCalendar( 'unselect' );

       template = '<div>Starts : ' + startDate.toLocaleTimeString() + '</div><div>Ends : ' + endDate.toLocaleTimeString() + '</div>';
       $("<div></div>")
        .html( template )
        .data( "event", { start:startDate, end:endDate } )
        .dialog ({  title : "Add A Recording",
                    width : 300,
                   height : 150,
                    modal : true,
                 appendTo : "body",
                   buttons: { 
                              'Never Mind':function(){ $(this).dialog("close") } ,
                              'Create':function(){ $(this).dialog("close"); handleAdd(  $(this).data("event"), true) } 
                             }


                 });                             
                 

}


var showPreview=function( mediaName ) {

   previewID='media-'+mediaName+'-preview'

   preview=$('#'+previewID);
   if( !preview.exists() ) {

       var url='http://'+window.location.hostname+':8990/preview';
       var width='864';
       var height='480';

       template =  '<object type="application/x-vlc-plugin" data="'+url+'" width="'+width+'" height="'+height+'" id="'+previewID+'-content" controls="yes">' +
                   ' <param name="movie" value="$url"/>' + 
                   ' <embed type="application/x-vlc-plugin" name="'+previewID+'-content"  autoplay="yes"  loop="no" width="'+width+'" height="'+height+'"  target="'+url+'" />' + 
                  '</object>';

       // Create a modal dialog and throw the preview in it
       $("<div></div>", {id:previewID} )
       .html( template )
       .dialog ({  title : url,
                  modal : true,
                   width: parseInt(width)+70,
                  height: parseInt(height)+70,
                appendTo: "body",
                   close : function() {  mediaName=$(this).attr('id').split('-')[1]; toggleMedia( $('#media-'+mediaName) ); $(this).dialog("destroy") }
                });                             
  }
 }



 var showIcon=function(icon) {
 
   var link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = './'+icon;
    document.getElementsByTagName('head')[0].appendChild(link);
}






