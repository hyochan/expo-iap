require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoIap'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  # WARNING: DO NOT MODIFY platform versions from 13.4
  # Changing iOS/tvOS to 15.0 can cause expo prebuild to exclude the module in certain Expo SDKs (known bug)
  # See: https://github.com/hyochan/expo-iap/issues/168
  # Even though StoreKit 2 requires iOS/tvOS 15.0+, keep both at 13.4 for compatibility with affected Expo SDKs
  # The iOS/tvOS 15.0+ requirement is enforced at build time in source code via @available annotations
  s.platforms      = { :ios => '13.4', :tvos => '13.4' }
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/hyochan/expo-iap' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'openiap', '~> 1.1.9'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
