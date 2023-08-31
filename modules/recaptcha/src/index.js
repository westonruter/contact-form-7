
	wpcf7_recaptcha = {
		...( wpcf7_recaptcha ?? {} ),
	};

	const siteKey = wpcf7_recaptcha.sitekey;
	const { homepage, contactform } = wpcf7_recaptcha.actions;

	const execute = options => {
		const { action, func, params } = options;

		grecaptcha.execute( siteKey, {
			action,
		} ).then( token => {
			const event = new CustomEvent( 'wpcf7grecaptchaexecuted', {
				detail: {
					action,
					token,
				},
			} );

			document.dispatchEvent( event );
		} ).then( () => {
			if ( typeof func === 'function' ) {
				func( ...params );
			}
		} ).catch( error => console.error( error ) );
	};

	/**
	 * Implement async-compatible reCAPTCHA loading, copied from https://developers.google.com/recaptcha/docs/loading
	 */
	// How this code snippet works:
	// This logic overwrites the default behavior of `grecaptcha.ready()` to
	// ensure that it can be safely called at any time. When `grecaptcha.ready()`
	// is called before reCAPTCHA is loaded, the callback function that is passed
	// by `grecaptcha.ready()` is enqueued for execution after reCAPTCHA is
	// loaded.
	if ( typeof grecaptcha === 'undefined' ) {
		grecaptcha = {};
	}
	grecaptcha.ready = function(cb){
		if ( ! grecaptcha.execute ) {
			// window.__grecaptcha_cfg is a global variable that stores reCAPTCHA's
			// configuration. By default, any functions listed in its 'fns' property
			// are automatically executed when reCAPTCHA loads.
			const c = '___grecaptcha_cfg';
			window[c] = window[c] || {};
			(window[c]['fns'] = window[c]['fns']||[]).push(cb);
		} else {
			cb();
		}
	}

	grecaptcha.ready( () => {
		execute( {
			action: homepage,
		} );
	} );
	// @TODO: This needs to wait until DOMContentLoaded in case there are other wpcf7grecaptchaexecuted event listeners added.

	document.addEventListener( 'change', event => {
		execute( {
			action: contactform,
		} );
	} );

	if ( typeof wpcf7 !== 'undefined' && typeof wpcf7.submit === 'function' ) {
		const submit = wpcf7.submit;

		wpcf7.submit = ( form, options = {} ) => {
			execute( {
				action: contactform,
				func: submit,
				params: [ form, options ],
			} );
		};
	}

	document.addEventListener( 'wpcf7grecaptchaexecuted', event => {
		const fields = document.querySelectorAll(
			'form.wpcf7-form input[name="_wpcf7_recaptcha_response"]'
		);

		for ( let i = 0; i < fields.length; i++ ) {
			let field = fields[ i ];
			field.setAttribute( 'value', event.detail.token );
		}
	} );
