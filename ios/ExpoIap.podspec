require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))
versions = JSON.parse(File.read(File.join(__dir__, '..', 'openiap-versions.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoIap'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  # WARNING: DO NOT MODIFY iOS platform version from 13.4
  # Changing iOS to 15.0 can cause expo prebuild to exclude the module in certain Expo SDKs (known bug)
  # See: https://github.com/hyochan/expo-iap/issues/168
  # Even though StoreKit 2 requires iOS 15.0+, keep iOS at 13.4 for compatibility with affected Expo SDKs
  # The iOS 15.0+ requirement is enforced at build time in source code via @available annotations
  #
  # NOTE: tvOS requires 16.0 because openiap dependency has minimum tvOS deployment target of 16.0
  s.platforms      = { :ios => '13.4', :tvos => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/hyochan/expo-iap' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'openiap', "#{versions['apple']}"

  # OnsideKit dependency is conditionally included via ENV var set by the Expo plugin.
  # When modules.onside is enabled, the plugin prepends ENV['EXPO_IAP_ONSIDE']='1' to the
  # Podfile, which makes this dependency active and enables #if canImport(OnsideKit) in Swift.
  if ENV['EXPO_IAP_ONSIDE'] == '1'
    s.dependency 'OnsideKit'
  end

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
