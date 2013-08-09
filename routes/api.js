

exports.login = function(req, res){
	// A user is trying to login using an emailbox access_token

	console.log('exports.login');

	// Set response Content-Type
	res.contentType('json');

	var bodyObj = req.body;
	
	if(typeof bodyObj != "object"){
		jsonError(res, 101, "Expecting object");
		return;
	}
	if(typeof bodyObj.access_token != "string"){
		jsonError(res, 101, "Expecting access_token",bodyObj);
		return;
	}

	// Request updated credentials from Emailbox
	// - via /api/user
	models.Api.loginUser(bodyObj)
		.then(function(user){
			// Succeeded in logging in the user
			// - log this person in using a cookie
			req.session.user = user; // user is OUR version of the user

			// Return success
			jsonSuccess(res,'Logged in',{
				user: {
					id: user.id,
					stripe_active: user.stripe_active,
					stripe_publishable_key: user.stripe_publishable_key
				}
			});
		})
		.fail(function(result){
			// Failed to log the user in
			jsonError(res,101,'Unable to log this user in', result);
		});

};

exports.logout = function(req, res){
	req.session.user = null;
	jsonSuccess(res,'Logged out');
};

exports.url = {

	create: function(req, res){
		// Accept an incoming create_url request from a user

		// Set response Content-Type
		res.contentType('json');

		// Must be logged in
		if(!req.session.user){
			jsonError(res,401,'Unauthorized. Requires login');
			return;
		}

		// Incoming params already json

		// Have necessary components?
		// - handled by Model just fine thank you
		// if(typeof jData.url != 'string'){
		// 	jsonError(res,400,'Expecting "url" in request');
		// 	return;
		// }

		// Add user data
		req.body.user_id = req.session.user.id;

		// Try to insert the URL into our database for this user
		models.Api.insertUrl(req.body)
			.then(function(){
				// Inserted nicely, sweet
				jsonSuccess(res,'Saved URL key');
			})
			.fail(function(result){
				// Failed inserting, probably already used
				jsonError(res,result.code,result.msg);
			});


	},

	rename: function(req, res){
		// Rename/change a URL for a Collection

		// Inactive

	},

	remove: function(req, res){
		// Inactive
	}

};

exports.clear_cache = function(req, res){
	res.render('index', { title: 'Express' });
};
