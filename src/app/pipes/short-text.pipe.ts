import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortText',
  standalone: true,
})
export class ShortTextPipe implements PipeTransform {
  transform(value: string, limit = 13): string {
    if (!value) return '';
    return value.length > limit ? value.substring(0, limit) + '…' : value;
  }
}