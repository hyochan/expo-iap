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
  # WARNING: DO NOT MODIFY iOS platform version from 13.4
  # Changing this to 15.0 causes expo prebuild to exclude the module in older Expo versions (known bug)
  # See: https://github.com/hyochan/expo-iap/issues/168
  # Even though the code requires iOS 15.0+ for StoreKit 2, keep this at 13.4 for compatibility across all Expo versions
  # The actual iOS 15.0+ requirement is enforced at build time
  s.platforms      = { :ios => '13.4', :tvos => '13.4' }
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/hyochan/expo-iap' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
