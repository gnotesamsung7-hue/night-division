package com.gnotesamsung7.nightdivision

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import java.io.IOException

class MainActivity : Activity() {

    private lateinit var web: WebView
    private var pendingCameraRequest: PermissionRequest? = null

    // Serves the bundled game from https://appassets.androidplatform.net/assets/www/
    // so the page counts as a secure site and is allowed to use the camera.
    private val loader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", object : WebViewAssetLoader.PathHandler {
                override fun handle(path: String): WebResourceResponse? = try {
                    val mime = when (path.substringAfterLast('.', "").lowercase()) {
                        "html" -> "text/html"
                        "js", "mjs" -> "text/javascript"
                        "css" -> "text/css"
                        "json" -> "application/json"
                        "wasm" -> "application/wasm"
                        "png" -> "image/png"
                        "svg" -> "image/svg+xml"
                        else -> "application/octet-stream"
                    }
                    val text = mime.startsWith("text/") || mime == "application/json"
                    WebResourceResponse(mime, if (text) "utf-8" else null, assets.open(path))
                } catch (e: IOException) {
                    null
                }
            })
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#0F1430"))
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.resources)
                    } else {
                        pendingCameraRequest = request
                        requestPermissions(arrayOf(Manifest.permission.CAMERA), CAMERA_REQUEST)
                    }
                }
            }
        }

        if (savedInstanceState == null) {
            web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        } else {
            web.restoreState(savedInstanceState)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != CAMERA_REQUEST) return
        val request = pendingCameraRequest ?: return
        pendingCameraRequest = null
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            request.grant(request.resources)
        } else {
            request.deny()
        }
    }

    @Suppress("DEPRECATION")
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() { web.onPause(); super.onPause() }
    override fun onResume() { super.onResume(); web.onResume() }
    override fun onDestroy() { web.destroy(); super.onDestroy() }

    companion object { private const val CAMERA_REQUEST = 7 }
}
