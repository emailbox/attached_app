// Simpler functions for plugins (like Models/components)

App.Plugins.Attached = {

	login: function(){
		// Login into our server

		var dfd = $.Deferred();

		var loginData = {
			access_token: App.Credentials.access_token
		};

		var ajaxOptions = {
			url: App.Credentials.base_local_url + '/api/login',
			type: 'POST',
			cache: false,
			data: loginData,
			dataType: 'json',
			// headers: {"Content-Type" : "application/json"},
			error: function(err){
				// Failed for some reason
				// - probably not on the internet
				console.log(2);
				if(!App.Data.online){
					alert('Unable to load a data connection (placeholder)');
				}
			},
			success: function(jData){
				// Result via Mailstats server
				// - sets cookie?

				if(jData.code != 200){
					//Failed logging in
					console.log('==failed logging in');
					dfd.reject(jData);
					return;
				}


				App.Credentials.app_user = jData.data.user;
				// clog('App.Credentials.app_user');
				// clog(App.Credentials.app_user);

				// dfd.resolve();

				// Backbone.history.loadUrl('body');

				// Resolve previous promise
				dfd.resolve(true);

				// Subscribe to push notifications
				if(useForge){
					// alert('subscribing');
					forge.partners.parse.push.subscribe('c_' + App.Credentials.app_user.id,
						function () {
							forge.logging.info("subscribed to push notifications!");
						},
						function (err) {
							forge.logging.error("error subscribing to push notifications: "+ JSON.stringify(err));
						}
					);
				}
				if(usePg){
					// todo...
				}


			}
		};

		if(useForge){
			clog('FORGE AJAX');
			window.forge.ajax(ajaxOptions);
		} else {
			$.ajax(ajaxOptions);
		}

		return dfd.promise();

	},

	start: function(){
		// Start the collection, set the Interval for updates

		// Get all photos
		App.Plugins.Attached.run();

	},


	run: function(){

		App.Plugins.Attached.search();

	},


	search: function(addlQueries){
		// Run the queries

		// Clear the wookmarks (if any existed)

		var dfd = $.Deferred();
		var anim = $.Deferred();

		$('#photos').animate({
				opacity: 0
			},
			{
				duration: 200,
				queue: true,
				complete: function(){
					anim.resolve();
				}
			});

		var conditions = {
			"original.attachments.thumbs.basewidth300" : { "$exists": true }
			// "original.attachments" : { "$gt": {} }
		};
					
		if(typeof addlQueries == 'object'){
			conditions = $.extend(conditions,addlQueries);
		}

		// Get emails that have an attachment
		anim.promise().then(function(){
			Api.search({
				queue: true,
				data: {
					model: 'Email',
					conditions: conditions,
					sort: {'common.date_sec' : -1},
					fields: ["original.attachments","original","original.TextBody","original.headers.From","original.headers.Subject"],
					limit: 200
				},
				success: function(response){

					try {
						var jData = JSON.parse(response);
					} catch(err){
						console.log('Failed API.count');
						return false;
					}

					if(jData.data.length < 1){
						$('#tiles').empty();
						$('#photos').addClass('empty');
						$('#photos').css('opacity',1);
						return;
					}
					$('#photos').removeClass('empty');

					// Got emails with attachments

					// Go through each
					var attachments = [];
					$.each(jData.data,function(i,email){

						// Rip out attachments
						$.each(email.Email.original.attachments,function(k,attachment){
							var allowed_types = ['image/png','image/jpeg','image/jpg'];
							if (allowed_types.indexOf(attachment.type) != -1){
								// Contains the correct image type
								// - ...trusting

								// Get the thumbnail(s)
								// - find the one we want
								attachments.push({
									email_id: email.Email._id,
									from: email.Email.original.headers.From,
									attachment: attachment,
									url_big: App.Credentials.s3_bucket + attachment.path,
									url_thumb: App.Credentials.s3_bucket + attachment.thumbs.basewidth300.path,
									subject: email.Email.original.headers.Subject,
									body: email.Email.original.TextBody
								});
								
							}
						});

					});


					// Add to list
					var template = App.Utils.template('t_tiles');

					// Write HTMl
					$('#tiles').html(template(attachments));

					// Apply wookmark
					var $tiles = $('#tiles');
					$tiles.imagesLoaded(function(){
						// var options = {
						// 	// autoResize: true, // This will auto-update the layout when the browser window is resized.
						// 	itemSelector : '.item',
						// 	columnWidth : 240
						// };
						var options = {
							autoResize: true, // This will auto-update the layout when the browser window is resized.
							container: $('#photos'), // Optional, used for some extra CSS styling
							offset: 10, // Optional, the distance between grid items
							itemWidth: 220 // Optional, the width of a grid item
						};

						// Start fade in
						$('#tiles li').wookmark(options);
						$('#photos').animate({
								opacity: 1
							},
							{
								duration: 500,
								queue: true
						});

						$('#photos').removeClass('invisible');

						// Attach fancybox
						// $(".fancybox").fancybox();

						// Hoverzoom
						// $('#photos .hoverzoom img').hoverZoom({
						// 	useBgImg: true
						// });

						// // Hover
						// $('.item').hover(function(){
						// 	var a = $(this).attr('data-email-id');
						// 	$('.item').removeClass('grouped');
						// 	$('.item[data-email-id="'+a+'"]').addClass('grouped');
						// },function(){
						// 	// No other hover actions, just on enter (should do mouseover/enter)
						// });

						$('.item .stack').click(function(){
							// Hide all the other ones in that group
							var $item = $(this).parents('.item');
							var a = $item.attr('data-email-id');
							if($item.hasClass('isstacked')){
								$('.item[data-email-id="'+a+'"]').removeClass('isstacked');
								$('.item[data-email-id="'+a+'"]').removeClass('stacked');
							} else {
								$item.addClass('skip');
								$('.item[data-email-id="'+a+'"]:not(.skip)').addClass('stacked');
								$('.item[data-email-id="'+a+'"]').addClass('isstacked');
								$item.removeClass('skip');
								// $('#tiles li').wookmark(options);
							}
						});
						
					});


					// var new_date = new Date(jData.data[0].Email.common.date);
					// $elem.find('.totals').append('Furthest back: ' + new_date.format('mediumDate') + '<br />');
				}
			});
		});


		return dfd.promise();

	}

}