require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))
versions = JSON.parse(File.read(File.join(__dir__, '..', 'openiap-versions.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoIapOnside'
  s.version        = package['version']
  s.summary        = "#{package['description']} (Onside)"
  s.description    = "#{package['description']} with optional OnsideKit integration"
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/hyochan/expo-iap' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'openiap', "#{versions['apple']}"
  s.dependency 'OnsideKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "onside/*.{swift}"
end
